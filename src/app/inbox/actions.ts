"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { isITTeamUser, requireAuthenticatedUser, requireServiceAgent } from "@/auth/session";
import { canManageServiceIssue } from "@/auth/issue-access";
import { db } from "@/db";
import {
  auditLogs,
  masterDivisions,
  requestStatusHistory,
  requestStatusNotifications,
  troubleshootingApprovals,
  troubleshootingIssues,
} from "@/db/schema";
import type {
  ActionResult,
  IssuePriority,
  IssueStatus,
} from "@/data/types";
import {
  genericServiceRequestTemplate,
  getServiceRequestTemplate,
} from "@/features/service-requests/template-registry";
import { getServiceInboxProfile } from "@/features/service-inbox/profile-registry";
import {
  getBasicStatusTransitionRequirement,
  getITRequestStatusTransitionRequirement,
} from "@/features/service-inbox/status-transitions";
import { issueStatusLabel } from "@/lib/issue-status";
import { generateRecordId } from "@/lib/record-id";

const priorities: IssuePriority[] = ["Low", "Medium", "High", "Critical"];
const MAX_WORK_PHOTO_BYTES = 2 * 1024 * 1024;
type PhotoIntent = "keep" | "replace" | "remove";

function field(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value || value.length > maxLength) {
    throw new Error(`${name} is required and must not exceed ${maxLength} characters.`);
  }
  return value;
}

function optionalField(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > maxLength) throw new Error(`${name} is too long.`);
  return value;
}

async function uploadedJpegPhoto(formData: FormData, fieldName: string, label: string) {
  const entry = formData.get(fieldName);
  if (!(entry instanceof File) || entry.size === 0) return null;
  if (entry.type !== "image/jpeg") {
    throw new Error(`The ${label} must be a compressed JPEG image.`);
  }
  if (entry.size < 1_000 || entry.size > MAX_WORK_PHOTO_BYTES) {
    throw new Error(`The ${label} must not exceed 2 MB.`);
  }

  const data = Buffer.from(await entry.arrayBuffer());
  const isJpeg =
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff &&
    data[data.length - 2] === 0xff &&
    data[data.length - 1] === 0xd9;
  if (!isJpeg) throw new Error(`The uploaded ${label} is invalid.`);
  return data;
}

async function uploadedWorkPhoto(formData: FormData) {
  return uploadedJpegPhoto(formData, "workPhoto", "work photo");
}

async function nextIssueId() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = generateRecordId("TR");
    const [existing] = await db
      .select({ id: troubleshootingIssues.id })
      .from(troubleshootingIssues)
      .where(eq(troubleshootingIssues.id, id))
      .limit(1);
    if (!existing) return id;
  }
  throw new Error("Unable to generate a unique troubleshooting ID.");
}

export async function saveIssueAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireServiceAgent();
  try {
    if (!isITTeamUser(currentUser)) {
      throw new Error("Non-IT divisions can only update request handling status.");
    }
    const id = optionalField(formData, "id", 32) || (await nextIssueId());
    const title = field(formData, "title", 200);
    const requesterName = field(formData, "requester", 120);
    const division = field(formData, "division", 120);
    const location = field(formData, "location", 160);
    const category = field(formData, "category", 80);
    const description = field(formData, "description", 10_000);
    const reportedDate = field(formData, "reportedDate", 10);
    const submittedPriority = optionalField(formData, "priority", 20);
    const requestedStatus = field(formData, "status", 40) as IssueStatus;
    const requestedPhotoIntent =
      optionalField(formData, "photoIntent", 10) || "keep";
    if (!["keep", "replace", "remove"].includes(requestedPhotoIntent)) {
      throw new Error("Invalid work photo action.");
    }
    const photoIntent = requestedPhotoIntent as PhotoIntent;

    const [existing] = await db
      .select({
        status: troubleshootingIssues.status,
        priority: troubleshootingIssues.priority,
        completedDays: troubleshootingIssues.completedDays,
        workPhotoData: troubleshootingIssues.workPhotoData,
        source: troubleshootingIssues.source,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
        inboxProfileKey: masterDivisions.inboxProfileKey,
      })
      .from(troubleshootingIssues)
      .innerJoin(
        masterDivisions,
        eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id),
      )
      .where(eq(troubleshootingIssues.id, id))
      .limit(1);
    if (!existing && !isITTeamUser(currentUser)) {
      throw new Error("The Add Issue feature is available to the IT division only.");
    }
    if (existing && !canManageServiceIssue(currentUser, existing.serviceDivisionId)) {
      throw new Error("You cannot manage requests assigned to another division.");
    }
    if (
      existing?.source === "division_request" &&
      currentUser.role !== "administrator"
    ) {
      throw new Error("Requests from another division can only update status and work evidence.");
    }
    const inboxProfile = getServiceInboxProfile(
      existing?.inboxProfileKey ?? "it-service",
    );
    const uploadedPhotoEntry = formData.get("workPhoto");
    if (
      !inboxProfile.features.workPhoto &&
      ((uploadedPhotoEntry instanceof File && uploadedPhotoEntry.size > 0) ||
        photoIntent !== "keep")
    ) {
      throw new Error("Work photos are not enabled for this division.");
    }
    const workPhotoData = inboxProfile.features.workPhoto
      ? await uploadedWorkPhoto(formData)
      : null;
    if (photoIntent === "replace" && !workPhotoData) {
      throw new Error("Select a work photo before saving.");
    }
    const priority = (submittedPriority || existing?.priority || "Medium") as IssuePriority;
    if (!priorities.includes(priority)) throw new Error("Invalid priority.");
    const mayKeepCompleted =
      !inboxProfile.features.directCompletion &&
      existing?.status === "Completed" &&
      requestedStatus === "Completed";
    if (!inboxProfile.editableStatuses.includes(requestedStatus) && !mayKeepCompleted) {
      throw new Error("Completed status can only be set through client approval.");
    }
    const hasFinalWorkPhoto =
      Boolean(workPhotoData) ||
      (photoIntent === "keep" && Boolean(existing?.workPhotoData));
    if (
      requestedStatus === "Waiting for Client Approval" &&
      (!inboxProfile.features.approvalQr || !hasFinalWorkPhoto)
    ) {
      throw new Error("Add a work photo before requesting client approval.");
    }
    const reportedAt = new Date(`${reportedDate}T00:00:00+07:00`);
    if (Number.isNaN(reportedAt.getTime())) throw new Error("Invalid request date.");

    const photoValues = workPhotoData
      ? {
          workPhotoData,
          workPhotoMimeType: "image/jpeg",
          workPhotoFileName: `work-photo-${id}.jpg`,
        }
      : photoIntent === "remove"
        ? {
            workPhotoData: null,
            workPhotoMimeType: null,
            workPhotoFileName: null,
          }
        : {};
    const values = {
      title,
      requesterName,
      division,
      location,
      category,
      description,
      reportedAt,
      priority,
      status: requestedStatus,
      completedDays:
        requestedStatus === "Completed" && inboxProfile.features.directCompletion
          ? Math.max(
              0,
              Math.floor((Date.now() - reportedAt.getTime()) / 86_400_000),
            )
          : mayKeepCompleted
            ? existing.completedDays
            : null,
      updatedAt: new Date(),
      ...photoValues,
    };

    if (existing) {
      await db
        .update(troubleshootingIssues)
        .set(values)
        .where(eq(troubleshootingIssues.id, id));
    } else {
      const [itServiceDivision] = await db
        .select({ id: masterDivisions.id, name: masterDivisions.name })
        .from(masterDivisions)
        .where(
          and(
            eq(masterDivisions.name, "IT Team"),
            eq(masterDivisions.isServiceTarget, true),
          ),
        )
        .limit(1);
      if (!itServiceDivision) {
        throw new Error("The IT Team destination division has not been enabled in Master Data.");
      }
      await db.insert(troubleshootingIssues).values({
        id,
        ...values,
        source: "manual",
        serviceDivision: itServiceDivision.name,
        serviceDivisionId: itServiceDivision.id,
        requestFormKey: "it-support",
      });
    }

    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: existing ? "issue.updated" : "issue.created",
      entityType: "troubleshooting_issue",
      entityId: id,
    });
    revalidatePath("/");
    revalidatePath("/inbox");
    revalidatePath("/reports");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("Unable to save troubleshooting issue.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save issue.",
    };
  }
}

export async function updateIssueStatusAction(
  id: string,
  requestedStatusValue: string,
  reasonValue = "",
  requesterNoteValue = "",
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireServiceAgent();
  try {
    if (!/^(?:INC-[0-9]{4}-[0-9]{4,6}|TR-[0-9]{4}-[0-9]{4})$/.test(id)) {
      throw new Error("Invalid issue ID.");
    }

    const requestedStatus = requestedStatusValue.trim() as IssueStatus;
    const reason = reasonValue.trim();
    const requesterNote = requesterNoteValue.trim();
    if (reason.length > 1_000) {
      throw new Error("The internal reason must not exceed 1000 characters.");
    }
    if (requesterNote.length > 500) {
      throw new Error("The requester note must not exceed 500 characters.");
    }
    const [issue] = await db
      .select({
        status: troubleshootingIssues.status,
        reportedAt: troubleshootingIssues.reportedAt,
        completedDays: troubleshootingIssues.completedDays,
        requesterId: troubleshootingIssues.requesterId,
        source: troubleshootingIssues.source,
        workPhotoData: troubleshootingIssues.workPhotoData,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
        inboxProfileKey: masterDivisions.inboxProfileKey,
      })
      .from(troubleshootingIssues)
      .innerJoin(
        masterDivisions,
        eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id),
      )
      .where(eq(troubleshootingIssues.id, id))
      .limit(1);

    if (!issue) throw new Error("Issue was not found.");
    if (!canManageServiceIssue(currentUser, issue.serviceDivisionId)) {
      throw new Error("You cannot manage requests assigned to another division.");
    }

    const inboxProfile = getServiceInboxProfile(issue.inboxProfileKey);
    const isITRequestWorkflow =
      inboxProfile.key === "it-service" && issue.source === "division_request";
    if (
      inboxProfile.key !== "basic-service" &&
      !isITRequestWorkflow
    ) {
      throw new Error("This issue does not use status-only handling.");
    }
    if (
      isITRequestWorkflow &&
      !isITTeamUser(currentUser) &&
      currentUser.role !== "administrator"
    ) {
      throw new Error("Only the IT division can update this request.");
    }
    if (!inboxProfile.editableStatuses.includes(requestedStatus)) {
      throw new Error("Invalid status for this division.");
    }
    const transitionRequirement = isITRequestWorkflow
      ? getITRequestStatusTransitionRequirement(issue.status, requestedStatus)
      : getBasicStatusTransitionRequirement(issue.status, requestedStatus);
    if (transitionRequirement === "unchanged") {
      return { ok: true, data: { id } };
    }
    if (transitionRequirement === "invalid") {
      throw new Error(`Status cannot be changed from ${issueStatusLabel(issue.status)} to ${issueStatusLabel(requestedStatus)}.`);
    }
    if (transitionRequirement === "reason" && reason.length < 5) {
      throw new Error("Provide an internal reason of at least 5 characters.");
    }
    if (
      requestedStatus === "Waiting for Client Approval" &&
      !issue.workPhotoData
    ) {
      throw new Error("Add a work photo before requesting client approval.");
    }

    const completedDays =
      requestedStatus === "Completed"
        ? issue.status === "Completed"
          ? issue.completedDays
          : Math.max(
              0,
              Math.floor((Date.now() - issue.reportedAt.getTime()) / 86_400_000),
            )
        : null;

    await db.transaction(async (tx) => {
      await tx
        .update(troubleshootingIssues)
        .set({
          status: requestedStatus,
          completedDays,
          updatedAt: new Date(),
        })
        .where(eq(troubleshootingIssues.id, id));

      if (issue.requesterId) {
        await tx.insert(requestStatusNotifications).values({
          recipientId: issue.requesterId,
          issueId: id,
          status: requestedStatus,
          requesterNote: requesterNote || null,
        });
      }

      await tx.insert(requestStatusHistory).values({
        issueId: id,
        changedById: currentUser.id,
        previousStatus: issue.status,
        status: requestedStatus,
        reason: reason || null,
        requesterNote: requesterNote || null,
      });

      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "issue.status_updated",
        entityType: "troubleshooting_issue",
        entityId: id,
        metadata: {
          previousStatus: issue.status,
          status: requestedStatus,
          reason: reason || null,
          requesterNote: requesterNote || null,
          requesterNotified: Boolean(issue.requesterId),
        },
      });
    });
    revalidatePath("/");
    revalidatePath("/inbox");
    revalidatePath("/requests");
    revalidatePath("/reports");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("Unable to update issue status.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update status.",
    };
  }
}

export async function createRequesterTicketAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  try {
    if (!currentUser.divisionId) {
      throw new Error("Your account has no assigned division. Please contact an administrator.");
    }
    const [division] = await db
      .select({ name: masterDivisions.name })
      .from(masterDivisions)
      .where(eq(masterDivisions.id, currentUser.divisionId))
      .limit(1);
    if (!division) throw new Error("The account division could not be found.");

    const serviceDivisionId = optionalField(formData, "serviceDivisionId", 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceDivisionId)) {
      throw new Error("The destination division is invalid.");
    }
    if (serviceDivisionId === currentUser.divisionId) {
      throw new Error("A request cannot be submitted to your own division.");
    }
    const [serviceDivision] = await db
      .select({
        id: masterDivisions.id,
        name: masterDivisions.name,
        isServiceTarget: masterDivisions.isServiceTarget,
        requestFormKey: masterDivisions.requestFormKey,
        inboxProfileKey: masterDivisions.inboxProfileKey,
      })
      .from(masterDivisions)
      .where(eq(masterDivisions.id, serviceDivisionId))
      .limit(1);
    if (!serviceDivision?.isServiceTarget) {
      throw new Error("The destination division is not available for requests.");
    }
    const template =
      getServiceRequestTemplate(serviceDivision.requestFormKey) ?? genericServiceRequestTemplate;
    const inboxProfile = getServiceInboxProfile(serviceDivision.inboxProfileKey);

    const requestData: Record<string, string> = {};
    let title = "";
    let category = template.label;
    const location = field(formData, "location", 160);
    let description = "";
    let requesterPhotoData: Buffer | null = null;

    for (const formField of template.fields) {
      if (formField.type === "photo") {
        if (!inboxProfile.features.requesterPhoto) continue;
        const photo = await uploadedJpegPhoto(
          formData,
          formField.key,
          formField.label,
        );
        if (photo) {
          requesterPhotoData = photo;
        } else if (formField.required) {
          throw new Error(`${formField.label} is required.`);
        }
        continue;
      }

      const rawValue = String(formData.get(formField.key) ?? "").trim();
      if (formField.required && !rawValue) {
        throw new Error(`${formField.label} is required.`);
      }
      if (formField.maxLength && rawValue.length > formField.maxLength) {
        throw new Error(`${formField.label} must not exceed ${formField.maxLength} characters.`);
      }

      if (rawValue) {
        requestData[formField.key] = rawValue;
      }

      if (formField.ticketField === "title") {
        title = rawValue;
      } else if (formField.ticketField === "category") {
        category = rawValue;
      } else if (formField.ticketField === "description") {
        description = rawValue;
      }
    }

    if (!title) {
      title = optionalField(formData, "title", 200) || `${template.label} - ${division.name}`;
    }
    if (!description) {
      description = optionalField(formData, "description", 10_000) || template.description;
    }

    if (!inboxProfile.features.requesterPhoto) {
      const submittedPhotoFields = [
        formData.get("requesterPhoto"),
        ...template.fields
          .filter((formField) => formField.type === "photo")
          .map((formField) => formData.get(formField.key)),
      ];
      if (
        submittedPhotoFields.some(
          (entry) => entry instanceof File && entry.size > 0,
        )
      ) {
        throw new Error("Supporting photos are not enabled for this division.");
      }
    } else if (!requesterPhotoData) {
      requesterPhotoData = await uploadedJpegPhoto(
        formData,
        "requesterPhoto",
        "supporting photo",
      );
    }

    const priority = (optionalField(formData, "priority", 20) || "Medium") as IssuePriority;
    if (!priorities.includes(priority)) throw new Error("The priority is invalid.");

    const id = await nextIssueId();
    const reportedAt = new Date();
    await db.insert(troubleshootingIssues).values({
      id,
      title,
      category,
      requesterName: currentUser.username,
      requesterEmail: null,
      requesterId: currentUser.id,
      source: "division_request",
      division: division.name,
      serviceDivision: serviceDivision.name,
      serviceDivisionId: serviceDivision.id,
      requestFormKey: template.key,
      requestData,
      location,
      reportedAt,
      priority,
      status: "New",
      completedDays: null,
      description,
      resolution: "",
      requesterPhotoData,
      requesterPhotoMimeType: requesterPhotoData ? "image/jpeg" : null,
      requesterPhotoFileName: requesterPhotoData ? `requester-photo-${id}.jpg` : null,
    });
    await db.insert(auditLogs).values({
      actorType: currentUser.role === "requester" ? "requester" : "technician",
      actorId: currentUser.id,
      action: "issue.requested",
      entityType: "troubleshooting_issue",
      entityId: id,
      metadata: {
        requestFormKey: template.key,
        serviceDivisionId: serviceDivision.id,
        serviceDivision: serviceDivision.name,
      },
    });
    revalidatePath("/");
    revalidatePath("/requests");
    revalidatePath("/inbox");
    revalidatePath("/reports");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("Unable to create requester ticket.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The request could not be created.",
    };
  }
}

export async function updateIssueWorkPhotoAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireServiceAgent();
  try {
    if (!isITTeamUser(currentUser)) {
      throw new Error("Work evidence is only available to the IT division.");
    }
    const id = field(formData, "id", 32);
    if (!/^(?:INC-[0-9]{4}-[0-9]{4,6}|TR-[0-9]{4}-[0-9]{4})$/.test(id)) {
      throw new Error("Invalid issue ID.");
    }
    const requestedPhotoIntent = optionalField(formData, "photoIntent", 10) || "keep";
    if (!["keep", "replace", "remove"].includes(requestedPhotoIntent)) {
      throw new Error("Invalid work photo action.");
    }
    const photoIntent = requestedPhotoIntent as PhotoIntent;
    const [issue] = await db
      .select({
        source: troubleshootingIssues.source,
        status: troubleshootingIssues.status,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
        inboxProfileKey: masterDivisions.inboxProfileKey,
      })
      .from(troubleshootingIssues)
      .innerJoin(
        masterDivisions,
        eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id),
      )
      .where(eq(troubleshootingIssues.id, id))
      .limit(1);
    if (!issue) throw new Error("Issue was not found.");
    if (!canManageServiceIssue(currentUser, issue.serviceDivisionId)) {
      throw new Error("You cannot manage requests assigned to another division.");
    }
    if (issue.source !== "division_request") {
      throw new Error("Manual IT issues use the full edit form.");
    }
    if (!getServiceInboxProfile(issue.inboxProfileKey).features.workPhoto) {
      throw new Error("Work photos are not enabled for this division.");
    }
    if (issue.status === "Waiting for Client Approval" && photoIntent === "remove") {
      throw new Error("The work photo cannot be removed while client approval is pending.");
    }

    const workPhotoData = await uploadedWorkPhoto(formData);
    if (photoIntent === "replace" && !workPhotoData) {
      throw new Error("Select a work photo before saving.");
    }
    const photoValues = workPhotoData
      ? {
          workPhotoData,
          workPhotoMimeType: "image/jpeg",
          workPhotoFileName: `work-photo-${id}.jpg`,
        }
      : photoIntent === "remove"
        ? {
            workPhotoData: null,
            workPhotoMimeType: null,
            workPhotoFileName: null,
          }
        : {};

    await db.transaction(async (tx) => {
      await tx
        .update(troubleshootingIssues)
        .set({ ...photoValues, updatedAt: new Date() })
        .where(eq(troubleshootingIssues.id, id));
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "issue.work_photo_updated",
        entityType: "troubleshooting_issue",
        entityId: id,
        metadata: { photoIntent },
      });
    });
    revalidatePath("/");
    revalidatePath("/inbox");
    revalidatePath("/reports");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("Unable to update work evidence.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update work evidence.",
    };
  }
}

export async function deleteIssueAction(id: string): Promise<ActionResult> {
  const currentUser = await requireServiceAgent();
  try {
    if (!isITTeamUser(currentUser)) {
      throw new Error("Only the IT division or an administrator can delete requests.");
    }
    if (!/^(?:INC-[0-9]{4}-[0-9]{4,6}|TR-[0-9]{4}-[0-9]{4})$/.test(id)) {
      throw new Error("Invalid issue ID.");
    }
    const [issue] = await db
      .select({
        source: troubleshootingIssues.source,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
      })
      .from(troubleshootingIssues)
      .where(eq(troubleshootingIssues.id, id))
      .limit(1);
    if (!issue) throw new Error("Issue was not found.");
    if (!canManageServiceIssue(currentUser, issue.serviceDivisionId)) {
      throw new Error("You cannot delete requests assigned to another division.");
    }
    if (
      issue.source === "division_request" &&
      currentUser.role !== "administrator"
    ) {
      throw new Error("Requests from another division cannot be deleted.");
    }
    const [deleted] = await db
      .delete(troubleshootingIssues)
      .where(eq(troubleshootingIssues.id, id))
      .returning({ id: troubleshootingIssues.id });
    if (!deleted) throw new Error("Issue was not found.");
    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: "issue.deleted",
      entityType: "troubleshooting_issue",
      entityId: id,
    });
    revalidatePath("/");
    revalidatePath("/inbox");
    revalidatePath("/reports");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to delete troubleshooting issue.", error);
    return { ok: false, error: "Unable to delete issue." };
  }
}

export async function requestApprovalAction(
  issueId: string,
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const currentUser = await requireServiceAgent();
  try {
    const [issue] = await db
      .select({
        status: troubleshootingIssues.status,
        workPhotoData: troubleshootingIssues.workPhotoData,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
        inboxProfileKey: masterDivisions.inboxProfileKey,
      })
      .from(troubleshootingIssues)
      .innerJoin(
        masterDivisions,
        eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id),
      )
      .where(eq(troubleshootingIssues.id, issueId))
      .limit(1);
    if (!issue || !canManageServiceIssue(currentUser, issue.serviceDivisionId)) {
      throw new Error("Issue is not available to your division.");
    }
    const inboxProfile = getServiceInboxProfile(issue.inboxProfileKey);
    if (!inboxProfile.features.approvalQr) {
      throw new Error("QR approval is not enabled for this division.");
    }
    if (issue.status !== "Waiting for Client Approval") {
      throw new Error("Issue is not ready for client approval.");
    }
    if (!issue.workPhotoData) {
      throw new Error("Add a work photo before requesting client approval.");
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.transaction(async (tx) => {
      await tx
        .update(troubleshootingApprovals)
        .set({ status: "expired" })
        .where(
          and(
            eq(troubleshootingApprovals.issueId, issueId),
            eq(troubleshootingApprovals.status, "pending"),
          ),
        );
      await tx.insert(troubleshootingApprovals).values({
        issueId,
        requestedByTechnicianId: currentUser.id,
        tokenHash,
        expiresAt,
      });
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "approval.requested",
        entityType: "troubleshooting_issue",
        entityId: issueId,
        metadata: { expiresAt: expiresAt.toISOString() },
      });
    });
    return { ok: true, data: { token, expiresAt: expiresAt.toISOString() } };
  } catch (error) {
    console.error("Unable to create approval request.", error);
    return { ok: false, error: "Unable to create approval QR." };
  }
}

function approvalTokenHash(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Invalid approval token.");
  return createHash("sha256").update(token).digest("hex");
}

function signatureBuffer(dataUrl: string) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid signature image.");
  const data = Buffer.from(match[1], "base64");
  if (data.length < 100 || data.length > 500_000) {
    throw new Error("Signature image size is invalid.");
  }
  return data;
}

export async function approveIssueAction(input: {
  token: string;
  clientName: string;
  signatureDataUrl: string;
}): Promise<ActionResult<{ respondedAt: string }>> {
  try {
    const tokenHash = approvalTokenHash(input.token);
    const clientName = input.clientName.trim();
    if (!clientName || clientName.length > 120) throw new Error("Invalid client name.");
    const signatureData = signatureBuffer(input.signatureDataUrl);
    const respondedAt = new Date();

    await db.transaction(async (tx) => {
      const [approval] = await tx
        .update(troubleshootingApprovals)
        .set({
          status: "approved",
          clientName,
          signatureData,
          signatureMimeType: "image/png",
          respondedAt,
        })
        .where(
          and(
            eq(troubleshootingApprovals.tokenHash, tokenHash),
            eq(troubleshootingApprovals.status, "pending"),
            gt(troubleshootingApprovals.expiresAt, respondedAt),
          ),
        )
        .returning({ issueId: troubleshootingApprovals.issueId });
      if (!approval) throw new Error("Approval link is invalid or expired.");

      const [issue] = await tx
        .select({
          reportedAt: troubleshootingIssues.reportedAt,
          requesterId: troubleshootingIssues.requesterId,
          status: troubleshootingIssues.status,
          inboxProfileKey: masterDivisions.inboxProfileKey,
        })
        .from(troubleshootingIssues)
        .innerJoin(
          masterDivisions,
          eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id),
        )
        .where(eq(troubleshootingIssues.id, approval.issueId))
        .limit(1);
      if (!issue) throw new Error("Issue was not found.");
      if (!getServiceInboxProfile(issue.inboxProfileKey).features.approvalQr) {
        throw new Error("QR approval is no longer enabled for this division.");
      }
      const completedDays = Math.max(
        0,
        Math.floor((respondedAt.getTime() - issue.reportedAt.getTime()) / 86_400_000),
      );
      await tx
        .update(troubleshootingIssues)
        .set({ status: "Completed", completedDays, updatedAt: respondedAt })
        .where(eq(troubleshootingIssues.id, approval.issueId));
      if (issue.requesterId) {
        await tx.insert(requestStatusNotifications).values({
          recipientId: issue.requesterId,
          issueId: approval.issueId,
          status: "Completed",
        });
      }
      await tx.insert(requestStatusHistory).values({
        issueId: approval.issueId,
        changedById: null,
        previousStatus: issue.status,
        status: "Completed",
      });
      await tx.insert(auditLogs).values({
        actorType: "client",
        actorId: clientName,
        action: "approval.approved",
        entityType: "troubleshooting_issue",
        entityId: approval.issueId,
      });
    });

    revalidatePath("/");
    revalidatePath("/inbox");
    revalidatePath("/requests");
    revalidatePath("/reports");
    return { ok: true, data: { respondedAt: respondedAt.toISOString() } };
  } catch (error) {
    console.error("Unable to approve issue.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to approve issue.",
    };
  }
}

export async function rejectIssueAction(input: {
  token: string;
  clientName: string;
  reason: string;
}): Promise<ActionResult<{ respondedAt: string }>> {
  try {
    const tokenHash = approvalTokenHash(input.token);
    const clientName = input.clientName.trim();
    const reason = input.reason.trim();
    if (!clientName || clientName.length > 120) throw new Error("Invalid client name.");
    if (!reason || reason.length > 2_000) throw new Error("A valid reason is required.");
    const respondedAt = new Date();

    await db.transaction(async (tx) => {
      const [approval] = await tx
        .update(troubleshootingApprovals)
        .set({ status: "rejected", clientName, clientNote: reason, respondedAt })
        .where(
          and(
            eq(troubleshootingApprovals.tokenHash, tokenHash),
            eq(troubleshootingApprovals.status, "pending"),
            gt(troubleshootingApprovals.expiresAt, respondedAt),
          ),
        )
        .returning({ issueId: troubleshootingApprovals.issueId });
      if (!approval) throw new Error("Approval link is invalid or expired.");
      const [issue] = await tx
        .select({
          requesterId: troubleshootingIssues.requesterId,
          status: troubleshootingIssues.status,
          inboxProfileKey: masterDivisions.inboxProfileKey,
        })
        .from(troubleshootingIssues)
        .innerJoin(
          masterDivisions,
          eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id),
        )
        .where(eq(troubleshootingIssues.id, approval.issueId))
        .limit(1);
      if (!issue || !getServiceInboxProfile(issue.inboxProfileKey).features.approvalQr) {
        throw new Error("QR approval is no longer enabled for this division.");
      }
      await tx
        .update(troubleshootingIssues)
        .set({ status: "Reopened", updatedAt: respondedAt })
        .where(eq(troubleshootingIssues.id, approval.issueId));
      if (issue.requesterId) {
        await tx.insert(requestStatusNotifications).values({
          recipientId: issue.requesterId,
          issueId: approval.issueId,
          status: "Reopened",
          requesterNote: reason,
        });
      }
      await tx.insert(requestStatusHistory).values({
        issueId: approval.issueId,
        changedById: null,
        previousStatus: issue.status,
        status: "Reopened",
        reason,
        requesterNote: reason,
      });
      await tx.insert(auditLogs).values({
        actorType: "client",
        actorId: clientName,
        action: "approval.rejected",
        entityType: "troubleshooting_issue",
        entityId: approval.issueId,
        metadata: { reason },
      });
    });
    revalidatePath("/");
    revalidatePath("/inbox");
    revalidatePath("/requests");
    revalidatePath("/reports");
    return { ok: true, data: { respondedAt: respondedAt.toISOString() } };
  } catch (error) {
    console.error("Unable to reject issue.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to reject issue.",
    };
  }
}

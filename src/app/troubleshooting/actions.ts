"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import {
  auditLogs,
  troubleshootingApprovals,
  troubleshootingIssues,
} from "@/db/schema";
import type {
  ActionResult,
  IssuePriority,
  IssueStatus,
} from "@/data/types";
import { generateRecordId } from "@/lib/record-id";

const priorities: IssuePriority[] = ["Low", "Medium", "High", "Critical"];
const editableStatuses: IssueStatus[] = [
  "New",
  "In Progress",
  "Waiting for Client Approval",
  "Reopened",
];

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
  const currentUser = await requireAdministrator();
  try {
    const id = optionalField(formData, "id", 32) || (await nextIssueId());
    const title = field(formData, "title", 200);
    const requesterName = field(formData, "requester", 120);
    const division = field(formData, "division", 120);
    const location = field(formData, "location", 160);
    const category = field(formData, "category", 80);
    const description = field(formData, "description", 10_000);
    const reportedDate = field(formData, "reportedDate", 10);
    const priority = field(formData, "priority", 20) as IssuePriority;
    const requestedStatus = field(formData, "status", 40) as IssueStatus;

    if (!priorities.includes(priority)) throw new Error("Invalid priority.");
    const [existing] = await db
      .select({
        status: troubleshootingIssues.status,
        completedDays: troubleshootingIssues.completedDays,
      })
      .from(troubleshootingIssues)
      .where(eq(troubleshootingIssues.id, id))
      .limit(1);
    const mayKeepCompleted = existing?.status === "Completed" && requestedStatus === "Completed";
    if (!editableStatuses.includes(requestedStatus) && !mayKeepCompleted) {
      throw new Error("Completed status can only be set through client approval.");
    }
    const reportedAt = new Date(`${reportedDate}T00:00:00+07:00`);
    if (Number.isNaN(reportedAt.getTime())) throw new Error("Invalid request date.");

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
      completedDays: mayKeepCompleted ? existing.completedDays : null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(troubleshootingIssues)
        .set(values)
        .where(eq(troubleshootingIssues.id, id));
    } else {
      await db.insert(troubleshootingIssues).values({ id, ...values });
    }

    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: existing ? "issue.updated" : "issue.created",
      entityType: "troubleshooting_issue",
      entityId: id,
    });
    revalidatePath("/");
    revalidatePath("/troubleshooting");
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

export async function deleteIssueAction(id: string): Promise<ActionResult> {
  const currentUser = await requireAdministrator();
  try {
    if (!/^(?:INC-[0-9]{4}-[0-9]{4,6}|TR-[0-9]{4}-[0-9]{4})$/.test(id)) {
      throw new Error("Invalid issue ID.");
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
    revalidatePath("/troubleshooting");
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
  const currentUser = await requireAdministrator();
  try {
    const [issue] = await db
      .select({ status: troubleshootingIssues.status })
      .from(troubleshootingIssues)
      .where(eq(troubleshootingIssues.id, issueId))
      .limit(1);
    if (!issue || issue.status !== "Waiting for Client Approval") {
      throw new Error("Issue is not ready for client approval.");
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
        .select({ reportedAt: troubleshootingIssues.reportedAt })
        .from(troubleshootingIssues)
        .where(eq(troubleshootingIssues.id, approval.issueId))
        .limit(1);
      if (!issue) throw new Error("Issue was not found.");
      const completedDays = Math.max(
        0,
        Math.floor((respondedAt.getTime() - issue.reportedAt.getTime()) / 86_400_000),
      );
      await tx
        .update(troubleshootingIssues)
        .set({ status: "Completed", completedDays, updatedAt: respondedAt })
        .where(eq(troubleshootingIssues.id, approval.issueId));
      await tx.insert(auditLogs).values({
        actorType: "client",
        actorId: clientName,
        action: "approval.approved",
        entityType: "troubleshooting_issue",
        entityId: approval.issueId,
      });
    });

    revalidatePath("/");
    revalidatePath("/troubleshooting");
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
      await tx
        .update(troubleshootingIssues)
        .set({ status: "Reopened", updatedAt: respondedAt })
        .where(eq(troubleshootingIssues.id, approval.issueId));
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
    revalidatePath("/troubleshooting");
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

import "server-only";

import { createHash } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { isITRoleUser, requireAuthenticatedUser, requireITRoleUser } from "@/auth/session";
import { db } from "@/db";
import {
  backupUserInvitations,
  backupUsers,
  masterDivisions,
  requestStatusNotifications,
  workflowNotifications,
  requestWorkflowHistory,
  technicians,
  troubleshootingApprovals,
  troubleshootingIssues,
} from "@/db/schema";
import type {
  BackupRecord,
  ServiceAgentOption,
  TicketRecord,
} from "@/data/types";
import { getServiceInboxProfile } from "@/features/service-inbox/profile-registry";
import { jakartaDateInput } from "@/lib/jakarta-date";
import { accountRoleRequiresDivision } from "@/lib/account-role";
import { serviceInboxScope } from "@/data/issue-scope";
import { workflowNotificationHref, workflowNotificationText, type WorkflowNotificationKind } from "@/lib/workflow-notifications";
import { getAdminAlerts } from "@/data/admin-alerts";

const jakartaDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const assignedTechnicians = alias(technicians, "assigned_technicians");

function dateTimeInputValue(date: Date) {
  const formatted = jakartaDateTime.format(date);
  const [datePart, timePart] = formatted.split(", ");
  const [day, month, year] = datePart.split("/");
  return `${year}-${month}-${day}T${timePart}`;
}

function requesterStatusMessage(
  status: string,
  serviceDivision: string,
  requesterNote: string | null,
) {
  let message: string;
  if (status === "In Progress") {
    message = `The request is being handled by ${serviceDivision}.`;
  } else if (status === "Waiting for Client Approval") {
    message = `The request is waiting for client approval from ${serviceDivision}.`;
  } else if (status === "Completed") {
    message = `The request has been completed by ${serviceDivision}.`;
  } else if (status === "Reopened") {
    message = `The request was reopened for ${serviceDivision} to handle.`;
  } else {
    message = `The request status was returned to New by ${serviceDivision}.`;
  }
  return requesterNote ? `${message} ${requesterNote}` : message;
}

function toTicketRecord(
  row: Pick<
    typeof troubleshootingIssues.$inferSelect,
    | "id"
    | "title"
    | "category"
    | "requesterName"
    | "source"
    | "division"
    | "serviceDivision"
    | "receivingDivisionId"
    | "requestFormKey"
    | "requestData"
    | "location"
    | "reportedAt"
    | "priority"
    | "status"
    | "completedDays"
    | "completionDate"
    | "description"
    | "updatedAt"
    | "workflowStatus"
    | "workflowEnabled"
    | "approvalRequired"
    | "assignedTechnicianId"
  > & { requesterUsername?: string | null },
  hasWorkPhoto: boolean,
  hasRequesterPhoto: boolean,
  clientApproval: TicketRecord["clientApproval"] = null,
  inboxProfileKey = "basic-service",
  assignedTechnicianName: string | null = null,
): TicketRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    requester: row.requesterUsername ?? row.requesterName,
    source: row.source,
    division: row.division,
    serviceDivision: row.serviceDivision,
    receivingDivisionId: row.receivingDivisionId,
    inboxProfileKey,
    requestFormKey: row.requestFormKey,
    requestData: row.requestData,
    location: row.location,
    reportedAt: jakartaDateTime.format(row.reportedAt).split(",")[0],
    reportedAtIso: row.reportedAt.toISOString(),
    updatedAtIso: row.updatedAt.toISOString(),
    reportedDate: jakartaDateInput(row.reportedAt),
    priority: row.priority,
    status: row.status,
    completedDays: row.completedDays,
    completionDate: row.completionDate ?? "",
    description: row.description,
    hasWorkPhoto,
    workPhotoUrl: hasWorkPhoto
      ? `/inbox/${encodeURIComponent(row.id)}/photo?v=${row.updatedAt.getTime()}`
      : null,
    hasRequesterPhoto,
    requesterPhotoUrl: hasRequesterPhoto
      ? `/inbox/${encodeURIComponent(row.id)}/requester-photo?v=${row.updatedAt.getTime()}`
      : null,
    clientApproval,
    workflowStatus: row.workflowStatus,
    workflowEnabled: row.workflowEnabled,
    workflowNote: null,
    approvalRequired: row.approvalRequired,
    assignedTechnicianId: row.assignedTechnicianId,
    assignedTechnicianName,
  };
}

export function filterStalledTicketRecords(records: TicketRecord[]) {
  const staleBefore = Date.now() - 3 * 86_400_000;
  return records.filter(
    (record) => record.status !== "Completed" && Date.parse(record.updatedAtIso) < staleBefore,
  );
}

export async function getTicketRecords(options: { teamIt?: boolean } = {}): Promise<TicketRecord[]> {
  const currentUser = await requireAuthenticatedUser();
  const baseQuery = db
    .select({
      id: troubleshootingIssues.id,
      title: troubleshootingIssues.title,
      category: troubleshootingIssues.category,
      requesterName: troubleshootingIssues.requesterName,
      source: troubleshootingIssues.source,
      requesterUsername: technicians.username,
      division: troubleshootingIssues.division,
      serviceDivision: troubleshootingIssues.serviceDivision,
      receivingDivisionId: troubleshootingIssues.receivingDivisionId,
      requestFormKey: troubleshootingIssues.requestFormKey,
      requestData: troubleshootingIssues.requestData,
      location: troubleshootingIssues.location,
      reportedAt: troubleshootingIssues.reportedAt,
      priority: troubleshootingIssues.priority,
      status: troubleshootingIssues.status,
      completedDays: troubleshootingIssues.completedDays,
      completionDate: troubleshootingIssues.completionDate,
      description: troubleshootingIssues.description,
      updatedAt: troubleshootingIssues.updatedAt,
      workflowStatus: troubleshootingIssues.workflowStatus,
      workflowEnabled: troubleshootingIssues.workflowEnabled,
      approvalRequired: troubleshootingIssues.approvalRequired,
      assignedTechnicianId: troubleshootingIssues.assignedTechnicianId,
      assignedTechnicianName: assignedTechnicians.name,
      hasWorkPhoto: sql<boolean>`${troubleshootingIssues.workPhotoData} is not null`,
      hasRequesterPhoto: sql<boolean>`${troubleshootingIssues.requesterPhotoData} is not null`,
      inboxProfileKey: masterDivisions.inboxProfileKey,
    })
    .from(troubleshootingIssues)
    .leftJoin(technicians, eq(troubleshootingIssues.requesterId, technicians.id))
    .leftJoin(assignedTechnicians, eq(troubleshootingIssues.assignedTechnicianId, assignedTechnicians.id))
    .innerJoin(masterDivisions, eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id));

  const issueQuery = baseQuery.where(serviceInboxScope(currentUser, options));

  const [rows, approvedRows] = await Promise.all([
    issueQuery.orderBy(desc(troubleshootingIssues.reportedAt), desc(troubleshootingIssues.id)),
    db
      .selectDistinctOn([troubleshootingApprovals.issueId], {
        issueId: troubleshootingApprovals.issueId,
        clientName: troubleshootingApprovals.clientName,
        respondedAt: troubleshootingApprovals.respondedAt,
      })
      .from(troubleshootingApprovals)
      .where(eq(troubleshootingApprovals.status, "approved"))
      .orderBy(
        troubleshootingApprovals.issueId,
        desc(troubleshootingApprovals.respondedAt),
      ),
  ]);
  const latestWorkflowNotes = rows.length === 0 ? [] : await db
    .selectDistinctOn([requestWorkflowHistory.issueId], {
      issueId: requestWorkflowHistory.issueId,
      note: requestWorkflowHistory.note,
    })
    .from(requestWorkflowHistory)
    .where(inArray(requestWorkflowHistory.issueId, rows.map((row) => row.id)))
    .orderBy(requestWorkflowHistory.issueId, desc(requestWorkflowHistory.createdAt));
  const workflowNotes = new Map(latestWorkflowNotes.map((row) => [row.issueId, row.note]));
  const approvalsByIssue = new Map<string, TicketRecord["clientApproval"]>();
  for (const approval of approvedRows) {
    if (
      approvalsByIssue.has(approval.issueId) ||
      !approval.clientName ||
      !approval.respondedAt
    ) continue;
    approvalsByIssue.set(approval.issueId, {
      clientName: approval.clientName,
      approvedAt: jakartaDateTime.format(approval.respondedAt).replace(",", ""),
      approvedAtIso: dateTimeInputValue(approval.respondedAt),
      signatureUrl: `/inbox/${encodeURIComponent(approval.issueId)}/signature?v=${approval.respondedAt.getTime()}`,
    });
  }
  return rows.map((row) => ({
    ...toTicketRecord(
      row,
      row.hasWorkPhoto,
      row.hasRequesterPhoto,
      approvalsByIssue.get(row.id) ?? null,
      row.inboxProfileKey,
      row.assignedTechnicianName,
    ),
    workflowNote: workflowNotes.get(row.id) ?? null,
  }));
}

export async function getAssignableServiceAgents(): Promise<ServiceAgentOption[]> {
  const currentUser = await requireAuthenticatedUser();
  if (
    currentUser.role !== "administrator" &&
    currentUser.role !== "receptionist" &&
    currentUser.role !== "approver"
  ) {
    return [];
  }
  const rows = await db
    .select({
      id: technicians.id,
      name: technicians.name,
      divisionId: technicians.divisionId,
      division: masterDivisions.name,
      isGaUnit: masterDivisions.isGaUnit,
    })
    .from(technicians)
    .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(
      and(
        eq(technicians.role, "service_agent"),
        eq(technicians.isActive, true),
      ),
    )
    .orderBy(asc(masterDivisions.name), asc(technicians.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    divisionId: row.divisionId!,
    division: row.division,
    isGaUnit: row.isGaUnit,
  }));
}

export async function getDivisionRequestRecords(): Promise<TicketRecord[]> {
  const currentUser = await requireAuthenticatedUser();
  if (!accountRoleRequiresDivision(currentUser.role) || !currentUser.divisionName) return [];

  const issueQuery = db
    .select({
      id: troubleshootingIssues.id,
      title: troubleshootingIssues.title,
      category: troubleshootingIssues.category,
      requesterName: troubleshootingIssues.requesterName,
      source: troubleshootingIssues.source,
      requesterUsername: technicians.username,
      division: troubleshootingIssues.division,
      serviceDivision: troubleshootingIssues.serviceDivision,
      receivingDivisionId: troubleshootingIssues.receivingDivisionId,
      requestFormKey: troubleshootingIssues.requestFormKey,
      requestData: troubleshootingIssues.requestData,
      location: troubleshootingIssues.location,
      reportedAt: troubleshootingIssues.reportedAt,
      priority: troubleshootingIssues.priority,
      status: troubleshootingIssues.status,
      completedDays: troubleshootingIssues.completedDays,
      completionDate: troubleshootingIssues.completionDate,
      description: troubleshootingIssues.description,
      updatedAt: troubleshootingIssues.updatedAt,
      workflowStatus: troubleshootingIssues.workflowStatus,
      workflowEnabled: troubleshootingIssues.workflowEnabled,
      approvalRequired: troubleshootingIssues.approvalRequired,
      assignedTechnicianId: troubleshootingIssues.assignedTechnicianId,
      assignedTechnicianName: assignedTechnicians.name,
      hasWorkPhoto: sql<boolean>`${troubleshootingIssues.workPhotoData} is not null`,
      hasRequesterPhoto: sql<boolean>`${troubleshootingIssues.requesterPhotoData} is not null`,
      inboxProfileKey: masterDivisions.inboxProfileKey,
    })
    .from(troubleshootingIssues)
    .leftJoin(technicians, eq(troubleshootingIssues.requesterId, technicians.id))
    .leftJoin(assignedTechnicians, eq(troubleshootingIssues.assignedTechnicianId, assignedTechnicians.id))
    .innerJoin(masterDivisions, eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id))
    .where(eq(troubleshootingIssues.division, currentUser.divisionName));
  const [rows, approvedRows] = await Promise.all([
    issueQuery.orderBy(desc(troubleshootingIssues.reportedAt), desc(troubleshootingIssues.id)),
    db
      .selectDistinctOn([troubleshootingApprovals.issueId], {
        issueId: troubleshootingApprovals.issueId,
        clientName: troubleshootingApprovals.clientName,
        respondedAt: troubleshootingApprovals.respondedAt,
      })
      .from(troubleshootingApprovals)
      .where(eq(troubleshootingApprovals.status, "approved"))
      .orderBy(
        troubleshootingApprovals.issueId,
        desc(troubleshootingApprovals.respondedAt),
      ),
  ]);
  const approvalsByIssue = new Map<string, TicketRecord["clientApproval"]>();
  for (const approval of approvedRows) {
    if (
      approvalsByIssue.has(approval.issueId) ||
      !approval.clientName ||
      !approval.respondedAt
    ) continue;
    approvalsByIssue.set(approval.issueId, {
      clientName: approval.clientName,
      approvedAt: jakartaDateTime.format(approval.respondedAt).replace(",", ""),
      approvedAtIso: dateTimeInputValue(approval.respondedAt),
      signatureUrl: `/inbox/${encodeURIComponent(approval.issueId)}/signature?v=${approval.respondedAt.getTime()}`,
    });
  }
  return rows.map((row) =>
    toTicketRecord(
      row,
      row.hasWorkPhoto,
      row.hasRequesterPhoto,
      approvalsByIssue.get(row.id) ?? null,
      row.inboxProfileKey,
      row.assignedTechnicianName,
    ),
  );
}

export async function getBackupRecords(): Promise<BackupRecord[]> {
  await requireITRoleUser();
  const rows = await db
    .select({
      id: backupUsers.id,
      fullName: backupUsers.fullName,
      division: backupUsers.division,
      username: backupUsers.username,
      email: backupUsers.email,
      hasPasswordInformation: sql<boolean>`${backupUsers.passwordInformation} is not null and length(${backupUsers.passwordInformation}) > 0`,
      syncPath: backupUsers.syncPath,
      status: backupUsers.status,
      submittedAt: backupUserInvitations.submittedAt,
    })
    .from(backupUsers)
    .leftJoin(
      backupUserInvitations,
      eq(backupUserInvitations.backupUserId, backupUsers.id),
    )
    .orderBy(desc(backupUserInvitations.submittedAt), desc(backupUsers.id));
  return rows.map((row) => ({
    id: row.id,
    user: row.fullName,
    division: row.division,
    username: row.username ?? "",
    email: row.email ?? "",
    hasPasswordInformation: row.hasPasswordInformation,
    syncPath: row.syncPath,
    submittedAt: row.submittedAt
      ? jakartaDateTime.format(row.submittedAt).replace(",", "")
      : "Not recorded",
    submittedAtIso: row.submittedAt
      ? dateTimeInputValue(row.submittedAt)
      : "",
    status: row.status,
  }));
}

export async function getNavigationCounts() {
  const currentUser = await requireAuthenticatedUser();
  const serviceDivisionFilter = currentUser.role === "administrator"
    ? isNotNull(troubleshootingIssues.requesterId)
    : currentUser.role === "receptionist"
      ? and(eq(troubleshootingIssues.workflowEnabled, true), inArray(troubleshootingIssues.workflowStatus, ["submitted", "needs_revision"]))
      : currentUser.role === "approver"
        ? and(
            eq(troubleshootingIssues.workflowEnabled, true),
            or(isNull(troubleshootingIssues.approverId), eq(troubleshootingIssues.approverId, currentUser.id)),
            inArray(troubleshootingIssues.workflowStatus, ["waiting_approver", "ready_for_assignment"]),
          )
        : currentUser.role === "final_approver"
          ? and(
              eq(troubleshootingIssues.workflowEnabled, true),
              eq(troubleshootingIssues.workflowStatus, "waiting_final_approver"),
            )
          : currentUser.role === "service_agent"
            ? and(
                eq(troubleshootingIssues.serviceDivisionId, currentUser.divisionId ?? "00000000-0000-4000-8000-000000000000"),
                isNotNull(troubleshootingIssues.requesterId),
                or(eq(troubleshootingIssues.workflowEnabled, false), eq(troubleshootingIssues.assignedTechnicianId, currentUser.id)),
                eq(troubleshootingIssues.workflowStatus, "assigned"),
              )
            : null;
  const newRequestFilter =
    serviceDivisionFilter
      ? and(serviceDivisionFilter, eq(troubleshootingIssues.status, "New"))
      : null;
  const inProgressRequestFilter =
    serviceDivisionFilter
      ? and(
          serviceDivisionFilter,
          eq(troubleshootingIssues.status, "In Progress"),
        )
      : null;
  const activeInboxFilter =
    serviceDivisionFilter
      ? and(
          serviceDivisionFilter,
          inArray(troubleshootingIssues.status, ["New", "In Progress"]),
        )
      : null;
  const requestNotificationFilter = eq(
    requestStatusNotifications.recipientId,
    currentUser.id,
  );
  const [
    [issues],
    [backups],
    [newRequests],
    [inProgressRequests],
    inboxNotificationRows,
    [unreadRequestNotifications],
    requestNotificationRows,
    [unreadWorkflowNotifications],
    workflowNotificationRows,
    adminAlerts,
  ] = await Promise.all([
    (currentUser.role === "requester"
      ? db.select({ value: count() }).from(troubleshootingIssues).where(eq(troubleshootingIssues.requesterId, currentUser.id))
      : db.select({ value: count() }).from(troubleshootingIssues).where(serviceInboxScope(currentUser))),
    isITRoleUser(currentUser)
      ? db.select({ value: count() }).from(backupUsers)
      : Promise.resolve([{ value: 0 }]),
    newRequestFilter
      ? db
          .select({ value: count() })
          .from(troubleshootingIssues)
          .where(newRequestFilter)
      : Promise.resolve([{ value: 0 }]),
    inProgressRequestFilter
      ? db
          .select({ value: count() })
          .from(troubleshootingIssues)
          .where(inProgressRequestFilter)
      : Promise.resolve([{ value: 0 }]),
    activeInboxFilter
      ? db
          .select({
            id: troubleshootingIssues.id,
            title: troubleshootingIssues.title,
            requester: troubleshootingIssues.requesterName,
            requesterUsername: technicians.username,
            division: troubleshootingIssues.division,
            status: troubleshootingIssues.status,
            reportedAt: troubleshootingIssues.reportedAt,
          })
          .from(troubleshootingIssues)
          .where(activeInboxFilter)
          .leftJoin(technicians, eq(troubleshootingIssues.requesterId, technicians.id))
          .orderBy(desc(troubleshootingIssues.updatedAt), desc(troubleshootingIssues.id))
          .limit(10)
      : Promise.resolve([]),
    db
      .select({ value: count() })
      .from(requestStatusNotifications)
      .where(
        and(
          requestNotificationFilter,
          isNull(requestStatusNotifications.readAt),
        ),
      ),
    db
      .select({
        id: requestStatusNotifications.id,
        issueId: requestStatusNotifications.issueId,
        status: requestStatusNotifications.status,
        requesterNote: requestStatusNotifications.requesterNote,
        createdAt: requestStatusNotifications.createdAt,
        title: troubleshootingIssues.title,
        serviceDivision: troubleshootingIssues.serviceDivision,
      })
      .from(requestStatusNotifications)
      .innerJoin(
        troubleshootingIssues,
        eq(requestStatusNotifications.issueId, troubleshootingIssues.id),
      )
      .where(
        and(
          requestNotificationFilter,
          isNull(requestStatusNotifications.readAt),
        ),
      )
      .orderBy(desc(requestStatusNotifications.createdAt))
      .limit(10),
    db
      .select({ value: count() })
      .from(workflowNotifications)
      .where(and(eq(workflowNotifications.recipientId, currentUser.id), isNull(workflowNotifications.readAt))),
    db
      .select({
        id: workflowNotifications.id,
        issueId: workflowNotifications.issueId,
        kind: workflowNotifications.kind,
        note: workflowNotifications.note,
        createdAt: workflowNotifications.createdAt,
        title: troubleshootingIssues.title,
      })
      .from(workflowNotifications)
      .innerJoin(troubleshootingIssues, eq(workflowNotifications.issueId, troubleshootingIssues.id))
      .where(and(eq(workflowNotifications.recipientId, currentUser.id), isNull(workflowNotifications.readAt)))
      .orderBy(desc(workflowNotifications.createdAt))
      .limit(10),
    currentUser.role === "administrator" ? getAdminAlerts() : Promise.resolve([]),
  ]);
  const workflowNotificationItems = workflowNotificationRows.map((row) => ({
    id: row.id,
    title: `${row.issueId} · ${row.title}`,
    description: workflowNotificationText(row.kind as WorkflowNotificationKind, row.note),
    reportedAt: jakartaDateTime.format(row.createdAt).replace(",", ""),
    href: workflowNotificationHref(row.kind as WorkflowNotificationKind),
    status: "New" as const,
  }));
  const inboxNotifications = inboxNotificationRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: `${row.requesterUsername ?? row.requester} · ${row.division}`,
    reportedAt: jakartaDateTime.format(row.reportedAt).replace(",", ""),
    href: "/inbox",
    status: row.status,
  }));
  const requestNotifications = requestNotificationRows.map((row) => ({
    id: row.id,
    title: `${row.issueId} · ${row.title}`,
    description: requesterStatusMessage(
      row.status,
      row.serviceDivision,
      row.requesterNote,
    ),
    reportedAt: jakartaDateTime.format(row.createdAt).replace(",", ""),
    href: "/requests",
    status: row.status,
  }));
  return {
    issues: issues.value,
    backups: backups.value,
    newRequests: newRequests.value,
    inProgressRequests: inProgressRequests.value,
    unreadRequestNotifications: unreadRequestNotifications.value,
    unreadWorkflowNotifications: unreadWorkflowNotifications.value,
    inboxNotifications,
    requestNotifications,
    workflowNotifications: workflowNotificationItems,
    adminAlerts,
  };
}

export interface ApprovalRecord {
  token: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expiresAt: string;
  clientName: string | null;
  clientNote: string | null;
  respondedAt: string | null;
  signatureImage: string | null;
  workPhotoImage: string | null;
  ticket: TicketRecord;
}

export async function getApprovalByToken(token: string): Promise<ApprovalRecord | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .select({
      approval: troubleshootingApprovals,
      issue: troubleshootingIssues,
      inboxProfileKey: masterDivisions.inboxProfileKey,
    })
    .from(troubleshootingApprovals)
    .innerJoin(
      troubleshootingIssues,
      eq(troubleshootingApprovals.issueId, troubleshootingIssues.id),
    )
    .innerJoin(
      masterDivisions,
      eq(troubleshootingIssues.serviceDivisionId, masterDivisions.id),
    )
    .where(eq(troubleshootingApprovals.tokenHash, tokenHash))
    .limit(1);

  if (!row || !getServiceInboxProfile(row.inboxProfileKey).features.approvalQr) {
    return null;
  }
  const status =
    row.approval.status === "pending" && row.approval.expiresAt <= new Date()
      ? "expired"
      : row.approval.status;
  const signatureImage =
    row.approval.signatureData && row.approval.signatureMimeType
      ? `data:${row.approval.signatureMimeType};base64,${Buffer.from(row.approval.signatureData).toString("base64")}`
      : null;
  const workPhotoImage =
    row.issue.workPhotoData && row.issue.workPhotoMimeType
      ? `data:${row.issue.workPhotoMimeType};base64,${Buffer.from(row.issue.workPhotoData).toString("base64")}`
      : null;

  return {
    token,
    status,
    expiresAt: row.approval.expiresAt.toISOString(),
    clientName: row.approval.clientName,
    clientNote: row.approval.clientNote,
    respondedAt: row.approval.respondedAt?.toISOString() ?? null,
    signatureImage,
    workPhotoImage,
    ticket: toTicketRecord(
      row.issue,
      Boolean(row.issue.workPhotoData),
      Boolean(row.issue.requesterPhotoData),
      null,
      row.inboxProfileKey,
      null,
    ),
  };
}

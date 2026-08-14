import "server-only";

import { createHash } from "node:crypto";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";

import { requireAdministrator, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import {
  backupUserInvitations,
  backupUsers,
  technicians,
  troubleshootingApprovals,
  troubleshootingIssues,
} from "@/db/schema";
import type {
  BackupRecord,
  TicketRecord,
} from "@/data/types";
import { jakartaDateInput } from "@/lib/jakarta-date";

const jakartaDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function dateTimeInputValue(date: Date) {
  const formatted = jakartaDateTime.format(date);
  const [datePart, timePart] = formatted.split(", ");
  const [day, month, year] = datePart.split("/");
  return `${year}-${month}-${day}T${timePart}`;
}

function toTicketRecord(
  row: Pick<
    typeof troubleshootingIssues.$inferSelect,
    | "id"
    | "title"
    | "category"
    | "requesterName"
    | "division"
    | "serviceDivision"
    | "requestFormKey"
    | "requestData"
    | "location"
    | "reportedAt"
    | "priority"
    | "status"
    | "completedDays"
    | "description"
    | "updatedAt"
  > & { requesterUsername?: string | null },
  hasWorkPhoto: boolean,
  hasRequesterPhoto: boolean,
  clientApproval: TicketRecord["clientApproval"] = null,
): TicketRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    requester: row.requesterUsername ?? row.requesterName,
    division: row.division,
    serviceDivision: row.serviceDivision,
    requestFormKey: row.requestFormKey,
    requestData: row.requestData,
    location: row.location,
    reportedAt: jakartaDateTime.format(row.reportedAt).split(",")[0],
    reportedDate: jakartaDateInput(row.reportedAt),
    priority: row.priority,
    status: row.status,
    completedDays: row.completedDays,
    description: row.description,
    hasWorkPhoto,
    workPhotoUrl: hasWorkPhoto
      ? `/troubleshooting/${encodeURIComponent(row.id)}/photo?v=${row.updatedAt.getTime()}`
      : null,
    hasRequesterPhoto,
    requesterPhotoUrl: hasRequesterPhoto
      ? `/troubleshooting/${encodeURIComponent(row.id)}/requester-photo?v=${row.updatedAt.getTime()}`
      : null,
    clientApproval,
  };
}

export async function getTicketRecords(): Promise<TicketRecord[]> {
  const currentUser = await requireAuthenticatedUser();
  const issueQuery = db
    .select({
      id: troubleshootingIssues.id,
      title: troubleshootingIssues.title,
      category: troubleshootingIssues.category,
      requesterName: troubleshootingIssues.requesterName,
      requesterUsername: technicians.username,
      division: troubleshootingIssues.division,
      serviceDivision: troubleshootingIssues.serviceDivision,
      requestFormKey: troubleshootingIssues.requestFormKey,
      requestData: troubleshootingIssues.requestData,
      location: troubleshootingIssues.location,
      reportedAt: troubleshootingIssues.reportedAt,
      priority: troubleshootingIssues.priority,
      status: troubleshootingIssues.status,
      completedDays: troubleshootingIssues.completedDays,
      description: troubleshootingIssues.description,
      updatedAt: troubleshootingIssues.updatedAt,
      hasWorkPhoto: sql<boolean>`${troubleshootingIssues.workPhotoData} is not null`,
      hasRequesterPhoto: sql<boolean>`${troubleshootingIssues.requesterPhotoData} is not null`,
    })
    .from(troubleshootingIssues)
    .leftJoin(technicians, eq(troubleshootingIssues.requesterId, technicians.id));
  const [rows, approvedRows] = await Promise.all([
    (currentUser.role === "requester"
      ? issueQuery.where(eq(troubleshootingIssues.requesterId, currentUser.id))
      : issueQuery
    ).orderBy(desc(troubleshootingIssues.reportedAt), desc(troubleshootingIssues.id)),
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
      signatureUrl: `/troubleshooting/${encodeURIComponent(approval.issueId)}/signature?v=${approval.respondedAt.getTime()}`,
    });
  }
  return rows.map((row) =>
    toTicketRecord(row, row.hasWorkPhoto, row.hasRequesterPhoto, approvalsByIssue.get(row.id) ?? null),
  );
}

export async function getBackupRecords(): Promise<BackupRecord[]> {
  await requireAdministrator();
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
  const [[issues], [backups], [newRequests], newRequestRows] = await Promise.all([
    (currentUser.role === "requester"
      ? db.select({ value: count() }).from(troubleshootingIssues).where(eq(troubleshootingIssues.requesterId, currentUser.id))
      : db.select({ value: count() }).from(troubleshootingIssues)),
    currentUser.role === "requester"
      ? Promise.resolve([{ value: 0 }])
      : db.select({ value: count() }).from(backupUsers),
    currentUser.role === "administrator" || currentUser.role === "technician"
      ? db
          .select({ value: count() })
          .from(troubleshootingIssues)
          .where(
            and(
              isNotNull(troubleshootingIssues.requesterId),
              eq(troubleshootingIssues.status, "New"),
            ),
          )
      : Promise.resolve([{ value: 0 }]),
    currentUser.role === "administrator" || currentUser.role === "technician"
      ? db
          .select({
            id: troubleshootingIssues.id,
            title: troubleshootingIssues.title,
            requester: troubleshootingIssues.requesterName,
            requesterUsername: technicians.username,
            division: troubleshootingIssues.division,
            reportedAt: troubleshootingIssues.reportedAt,
          })
          .from(troubleshootingIssues)
          .where(
            and(
              isNotNull(troubleshootingIssues.requesterId),
              eq(troubleshootingIssues.status, "New"),
            ),
          )
          .leftJoin(technicians, eq(troubleshootingIssues.requesterId, technicians.id))
          .orderBy(desc(troubleshootingIssues.reportedAt), desc(troubleshootingIssues.id))
          .limit(5)
      : Promise.resolve([]),
  ]);
  return {
    issues: issues.value,
    backups: backups.value,
    newRequests: newRequests.value,
    notifications: newRequestRows.map((row) => ({
      id: row.id,
      title: row.title,
      requester: row.requesterUsername ?? row.requester,
      division: row.division,
      reportedAt: jakartaDateTime.format(row.reportedAt).replace(",", ""),
    })),
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
    .select({ approval: troubleshootingApprovals, issue: troubleshootingIssues })
    .from(troubleshootingApprovals)
    .innerJoin(
      troubleshootingIssues,
      eq(troubleshootingApprovals.issueId, troubleshootingIssues.id),
    )
    .where(eq(troubleshootingApprovals.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;
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
    ticket: toTicketRecord(row.issue, Boolean(row.issue.workPhotoData), Boolean(row.issue.requesterPhotoData)),
  };
}

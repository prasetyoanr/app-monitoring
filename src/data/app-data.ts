import "server-only";

import { createHash } from "node:crypto";
import { count, desc, eq, sql } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import {
  backupUserInvitations,
  backupUsers,
  monitoredServers,
  troubleshootingApprovals,
  troubleshootingIssues,
} from "@/db/schema";
import type {
  BackupRecord,
  ServerRecord,
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
    | "location"
    | "reportedAt"
    | "priority"
    | "status"
    | "completedDays"
    | "description"
  >,
): TicketRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    requester: row.requesterName,
    division: row.division,
    location: row.location,
    reportedAt: jakartaDateTime.format(row.reportedAt).split(",")[0],
    reportedDate: jakartaDateInput(row.reportedAt),
    priority: row.priority,
    status: row.status,
    completedDays: row.completedDays,
    description: row.description,
  };
}

export async function getTicketRecords(): Promise<TicketRecord[]> {
  await requireAuthenticatedUser();
  const rows = await db
    .select({
      id: troubleshootingIssues.id,
      title: troubleshootingIssues.title,
      category: troubleshootingIssues.category,
      requesterName: troubleshootingIssues.requesterName,
      division: troubleshootingIssues.division,
      location: troubleshootingIssues.location,
      reportedAt: troubleshootingIssues.reportedAt,
      priority: troubleshootingIssues.priority,
      status: troubleshootingIssues.status,
      completedDays: troubleshootingIssues.completedDays,
      description: troubleshootingIssues.description,
    })
    .from(troubleshootingIssues)
    .orderBy(desc(troubleshootingIssues.reportedAt), desc(troubleshootingIssues.id));
  return rows.map(toTicketRecord);
}

export async function getBackupRecords(): Promise<BackupRecord[]> {
  await requireAuthenticatedUser();
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
  await requireAuthenticatedUser();
  const [[issues], [backups]] = await Promise.all([
    db.select({ value: count() }).from(troubleshootingIssues),
    db.select({ value: count() }).from(backupUsers),
  ]);
  return { issues: issues.value, backups: backups.value };
}

export async function getServerRecords(): Promise<ServerRecord[]> {
  await requireAuthenticatedUser();
  const rows = await db
    .select()
    .from(monitoredServers)
    .orderBy(monitoredServers.name);
  return rows.map((row) => ({
    name: row.name,
    role: row.role,
    ip: row.ipAddress,
    status: row.status,
    cpu: row.cpuPercent,
    memory: row.memoryPercent,
    disk: row.diskPercent,
    uptime: `${row.uptimeDays} days`,
  }));
}

export interface ApprovalRecord {
  token: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expiresAt: string;
  clientName: string | null;
  clientNote: string | null;
  respondedAt: string | null;
  signatureImage: string | null;
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

  return {
    token,
    status,
    expiresAt: row.approval.expiresAt.toISOString(),
    clientName: row.approval.clientName,
    clientNote: row.approval.clientNote,
    respondedAt: row.approval.respondedAt?.toISOString() ?? null,
    signatureImage,
    ticket: toTicketRecord(row.issue),
  };
}

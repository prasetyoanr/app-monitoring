import "server-only";

import { createHash } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  backupUsers,
  itAssets,
  monitoredServers,
  surveyResponses,
  troubleshootingApprovals,
  troubleshootingIssues,
} from "@/db/schema";
import type {
  AssetRecord,
  BackupRecord,
  ServerRecord,
  SurveyRecord,
  TicketRecord,
} from "@/data/types";

const jakartaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const jakartaDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function dateInputValue(date: Date) {
  const parts = jakartaDate.formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateTimeInputValue(date: Date) {
  const formatted = jakartaDateTime.format(date);
  const [datePart, timePart] = formatted.split(", ");
  const [day, month, year] = datePart.split("/");
  return `${year}-${month}-${day}T${timePart}`;
}

function toTicketRecord(
  row: typeof troubleshootingIssues.$inferSelect,
): TicketRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    requester: row.requesterName,
    division: row.division,
    location: row.location,
    reportedAt: jakartaDateTime.format(row.reportedAt).split(",")[0],
    reportedDate: dateInputValue(row.reportedAt),
    priority: row.priority,
    status: row.status,
    completedDays: row.completedDays,
    description: row.description,
    resolution: row.resolution,
  };
}

function toBackupRecord(row: typeof backupUsers.$inferSelect): BackupRecord {
  return {
    id: row.id,
    user: row.fullName,
    username: row.username ?? "",
    email: row.email ?? "",
    passwordInformation: row.passwordInformation ?? "",
    syncPath: row.syncPath,
    lastBackup: row.lastBackupAt
      ? jakartaDateTime.format(row.lastBackupAt).replace(",", "")
      : "-",
    lastBackupIso: row.lastBackupAt ? dateTimeInputValue(row.lastBackupAt) : "",
    status: row.status,
  };
}

export async function getTicketRecords(): Promise<TicketRecord[]> {
  const rows = await db
    .select()
    .from(troubleshootingIssues)
    .orderBy(desc(troubleshootingIssues.reportedAt), desc(troubleshootingIssues.id));
  return rows.map(toTicketRecord);
}

export async function getBackupRecords(): Promise<BackupRecord[]> {
  const rows = await db
    .select()
    .from(backupUsers)
    .orderBy(desc(backupUsers.lastBackupAt), desc(backupUsers.id));
  return rows.map(toBackupRecord);
}

export async function getNavigationCounts() {
  const [[issues], [backups]] = await Promise.all([
    db.select({ value: count() }).from(troubleshootingIssues),
    db.select({ value: count() }).from(backupUsers),
  ]);
  return { issues: issues.value, backups: backups.value };
}

export async function getServerRecords(): Promise<ServerRecord[]> {
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

export async function getAssetRecords(): Promise<AssetRecord[]> {
  const rows = await db.select().from(itAssets).orderBy(itAssets.code);
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    type: row.type,
    user: row.assignedTo,
    department: row.department,
    status: row.status,
    health: row.healthPercent,
  }));
}

export async function getSurveyRecords(): Promise<SurveyRecord[]> {
  const rows = await db
    .select()
    .from(surveyResponses)
    .orderBy(desc(surveyResponses.respondedAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.clientName,
    department: row.department,
    score: row.score,
    comment: row.comment,
    ticket: row.issueReference,
    respondedAt: row.respondedAt.toISOString(),
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

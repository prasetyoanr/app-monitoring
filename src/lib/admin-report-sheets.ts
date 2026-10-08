import type { AdminOperationRecord } from "@/data/admin-operations";
import type { AuditLogRecord } from "@/data/audit-log-data";
import type { HealthStatus, SystemHealthReport } from "@/data/system-health";
import { sanitizeMetadata } from "@/lib/audit-log-export";
import { requestWorkflowLabel } from "@/lib/request-workflow";
import { issueStatusLabel } from "@/lib/issue-status";
import type { ReportColumn, ReportSheet, ReportTone } from "@/lib/role-report";

// Pure mappers: they only reshape data the administrator-gated loaders already return.

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function wib(value: string | Date) {
  return `${dateTime.format(new Date(value)).replace(",", "")} WIB`;
}

// ---------- Log ----------
export function logSheet(name: string, records: AuditLogRecord[]): ReportSheet {
  const count = (action: string) => records.filter((record) => record.action === action).length;
  const actors = new Set(records.map((record) => record.actorId ?? `${record.actorType}:${record.entityId}`));
  const columns: ReportColumn[] = [
    { header: "No.", key: "no", width: 6, align: "center" },
    { header: "Time (WIB)", key: "time", width: 22 },
    { header: "Actor type", key: "actorType", width: 12 },
    { header: "Actor", key: "actor", width: 24 },
    { header: "Username", key: "username", width: 18 },
    { header: "Action", key: "action", width: 32 },
    { header: "Entity type", key: "entityType", width: 20 },
    { header: "Entity ID", key: "entityId", width: 24 },
    { header: "Details", key: "details", width: 60, wrap: true },
  ];
  return {
    name,
    title: "Log — activity log",
    summary: [
      { label: "Events", value: String(records.length) },
      { label: "Failed logins", value: String(count("authentication.login_failed")) },
      { label: "Denied attempts", value: String(count("authorization.denied")) },
      { label: "Sensitive access", value: String(count("sensitive_data.accessed")) },
      { label: "Distinct actors", value: String(actors.size) },
    ],
    columns,
    tones: records.map(() => "none" as const),
    rows: records.map((record, index) => ({
      no: index + 1,
      time: wib(record.createdAt),
      actorType: record.actorType,
      actor: record.actorName ?? "—",
      username: record.actorUsername ?? "—",
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      // Secrets are redacted with the same rules as the CSV export on the Log page.
      details: record.metadata ? JSON.stringify(sanitizeMetadata(record.metadata)) : "—",
    })),
  };
}

// ---------- Utility: Admin Operations ----------
function attentionFlags(record: AdminOperationRecord) {
  const flags: string[] = [];
  if (record.invalidAssignment) flags.push("Invalid assignment");
  if (record.unassigned) flags.push("Awaiting assignment");
  if (record.stalled) flags.push(`Stalled ${record.inactiveDays} days`);
  return flags;
}

export function adminOperationsSheet(name: string, records: AdminOperationRecord[]): ReportSheet {
  const columns: ReportColumn[] = [
    { header: "No.", key: "no", width: 6, align: "center" },
    { header: "ID", key: "id", width: 18 },
    { header: "Request", key: "title", width: 40, wrap: true },
    { header: "Requester division", key: "division", width: 20 },
    { header: "Service unit", key: "serviceDivision", width: 20 },
    { header: "Stage", key: "stage", width: 26 },
    { header: "Status", key: "status", width: 18, align: "center" },
    { header: "Current assignee", key: "assignee", width: 22 },
    { header: "Last updated", key: "updated", width: 20, align: "center" },
    { header: "Attention", key: "attention", width: 28, align: "center", status: true },
  ];
  const tones: ReportTone[] = records.map((record) => (record.invalidAssignment || record.stalled ? "bad" : "wait"));
  return {
    name,
    title: "Utility — Admin Operations (snapshot)",
    summary: [
      { label: "Needs attention", value: String(records.length) },
      { label: "Stalled", value: String(records.filter((record) => record.stalled).length) },
      { label: "Awaiting assignment", value: String(records.filter((record) => record.unassigned).length) },
      { label: "Invalid assignment", value: String(records.filter((record) => record.invalidAssignment).length) },
    ],
    columns,
    tones,
    rows: records.map((record, index) => ({
      no: index + 1,
      id: record.id,
      title: record.title,
      division: record.division,
      serviceDivision: record.serviceDivision,
      stage: requestWorkflowLabel(record.workflowStatus),
      status: issueStatusLabel(record.status),
      assignee: record.currentAssignee ?? "—",
      updated: wib(record.lastUpdatedAt),
      attention: attentionFlags(record).join(" · ") || "—",
    })),
  };
}

// ---------- Utility: System Health ----------
const healthTone: Record<HealthStatus, ReportTone> = { healthy: "ok", warning: "wait", critical: "bad", unknown: "none" };
const healthLabel: Record<HealthStatus, string> = { healthy: "Healthy", warning: "Warning", critical: "Critical", unknown: "Unknown" };

export function systemHealthSheet(name: string, report: SystemHealthReport): ReportSheet {
  const columns: ReportColumn[] = [
    { header: "Check", key: "check", width: 20 },
    { header: "Status", key: "status", width: 14, align: "center", status: true },
    { header: "Value", key: "value", width: 24 },
    { header: "Detail", key: "detail", width: 70, wrap: true },
    { header: "Response (ms)", key: "responseTime", width: 14, align: "center" },
  ];
  return {
    name,
    title: "Utility — System Health (snapshot)",
    summary: [
      { label: "Overall", value: healthLabel[report.overallStatus] },
      { label: "Checked", value: wib(report.checkedAt) },
    ],
    columns,
    tones: report.checks.map((check) => healthTone[check.status]),
    rows: report.checks.map((check) => ({
      check: check.label,
      status: healthLabel[check.status],
      value: check.value,
      detail: check.detail,
      responseTime: check.responseTimeMs ?? null,
    })),
  };
}

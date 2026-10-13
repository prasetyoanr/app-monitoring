import { AUDIT_LOG_EXPORT_LIMIT, auditModuleOptions, getAuditLogExportRecords, type AuditActorType, type AuditEvent, type AuditLogFilters, type AuditModule, type AuditPeriod } from "@/data/audit-log-data";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { buildAuditLogCsv } from "@/lib/audit-log-export";
import { buildAuditLogWorkbook } from "@/lib/audit-log-workbook";

export const runtime = "nodejs";

function selectedValue<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value && allowed.includes(value as T) ? value as T : "";
}

function filtersFromUrl(url: URL): AuditLogFilters {
  const moduleValue = url.searchParams.get("module") ?? "";
  return {
    query: (url.searchParams.get("q") ?? "").trim().slice(0, 120),
    module: auditModuleOptions.some((option) => option.value === moduleValue) ? moduleValue as AuditModule : "",
    event: selectedValue<Exclude<AuditEvent, "">>(url.searchParams.get("event"), ["failed_login", "authorization_denied", "sensitive_access"]),
    actorType: selectedValue<Exclude<AuditActorType, "">>(url.searchParams.get("actor"), ["technician", "requester", "client", "system"]),
    period: selectedValue<Exclude<AuditPeriod, "">>(url.searchParams.get("period"), ["24h"]),
    fromDate: (url.searchParams.get("from") ?? "").slice(0, 10),
    toDate: (url.searchParams.get("to") ?? "").slice(0, 10),
    page: 1,
  };
}

const eventLabels: Record<Exclude<AuditEvent, "">, string> = {
  failed_login: "Failed sign-ins",
  authorization_denied: "Access denied",
  sensitive_access: "Sensitive data access",
};

// A sentence for the sheet header, so the file explains what it contains.
function describeFilters(filters: AuditLogFilters) {
  const parts = [
    filters.module ? `Module: ${auditModuleOptions.find((option) => option.value === filters.module)?.label ?? filters.module}` : null,
    filters.event ? `Event: ${eventLabels[filters.event]}` : null,
    filters.actorType ? `Actor type: ${filters.actorType}` : null,
    filters.period === "24h" ? "Last 24 hours" : null,
    filters.fromDate ? `From: ${filters.fromDate}` : null,
    filters.toDate ? `To: ${filters.toDate}` : null,
    filters.query ? "Text search applied" : null,
  ].filter(Boolean);
  return parts.length ? parts.join("  ·  ") : "None (all records)";
}

function jakartaFileTimestamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}-${part("hour")}${part("minute")}`;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const filters = filtersFromUrl(url);
  // The workbook is the default; CSV stays available for tools that need plain text.
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const result = await getAuditLogExportRecords(filters);
  const body = format === "csv"
    ? buildAuditLogCsv(result.records)
    : await buildAuditLogWorkbook(result.records, {
        generatedAt: `${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(new Date())} WIB`,
        filterSummary: describeFilters(filters),
        truncated: result.truncated,
        limit: AUDIT_LOG_EXPORT_LIMIT,
      });

  await db.insert(auditLogs).values({
    actorType: "technician",
    actorId: result.exportedBy,
    action: "audit_log.exported",
    entityType: "audit_log",
    entityId: format,
    metadata: {
      recordCount: result.records.length,
      truncated: result.truncated,
      filters: {
        hasQuery: Boolean(filters.query),
        module: filters.module || null,
        event: filters.event || null,
        actorType: filters.actorType || null,
        period: filters.period || null,
        fromDate: filters.fromDate || null,
        toDate: filters.toDate || null,
      },
    },
  });

  return new Response(new Uint8Array(typeof body === "string" ? Buffer.from(body) : body), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="activity-log-${jakartaFileTimestamp()}.${format}"`,
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
      "X-Export-Truncated": result.truncated ? "true" : "false",
    },
  });
}

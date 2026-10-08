import { auditModuleOptions, getAuditLogExportRecords, type AuditActorType, type AuditEvent, type AuditLogFilters, type AuditModule, type AuditPeriod } from "@/data/audit-log-data";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { buildAuditLogCsv } from "@/lib/audit-log-export";

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
  const filters = filtersFromUrl(new URL(request.url));
  const result = await getAuditLogExportRecords(filters);
  const csv = buildAuditLogCsv(result.records);

  await db.insert(auditLogs).values({
    actorType: "technician",
    actorId: result.exportedBy,
    action: "audit_log.exported",
    entityType: "audit_log",
    entityId: "csv",
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

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="activity-log-${jakartaFileTimestamp()}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Export-Truncated": result.truncated ? "true" : "false",
    },
  });
}

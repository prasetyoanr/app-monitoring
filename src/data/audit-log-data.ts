import "server-only";

import { and, count, desc, eq, gte, ilike, like, lt, or, sql, type SQL } from "drizzle-orm";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, technicians } from "@/db/schema";

export const AUDIT_LOG_PAGE_SIZE = 50;

export const auditModuleOptions = [
  { value: "", label: "All modules" },
  { value: "authentication", label: "Authentication" },
  { value: "security", label: "Security & sensitive access" },
  { value: "accounts", label: "Accounts" },
  { value: "requests", label: "Requests & workflow" },
  { value: "master_data", label: "Master data" },
  { value: "activities", label: "GA activities" },
  { value: "reports", label: "Report exports" },
  { value: "surveys", label: "Surveys" },
  { value: "backups", label: "Backup users" },
] as const;

export type AuditModule = (typeof auditModuleOptions)[number]["value"];
export type AuditActorType = "" | "technician" | "requester" | "client" | "system";
export type AuditEvent = "" | "failed_login" | "authorization_denied" | "sensitive_access";
export type AuditPeriod = "" | "24h";

export interface AuditLogFilters {
  query: string;
  module: AuditModule;
  event: AuditEvent;
  actorType: AuditActorType;
  period: AuditPeriod;
  fromDate: string;
  toDate: string;
  page: number;
}

function eventCondition(event: AuditEvent): SQL | undefined {
  if (event === "failed_login") return eq(auditLogs.action, "authentication.login_failed");
  if (event === "authorization_denied") return eq(auditLogs.action, "authorization.denied");
  if (event === "sensitive_access") return eq(auditLogs.action, "sensitive_data.accessed");
  return undefined;
}

export interface AuditLogRecord {
  id: string;
  actorType: Exclude<AuditActorType, "">;
  actorId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+07:00`));
}

function moduleCondition(module: AuditModule): SQL | undefined {
  if (module === "authentication") return like(auditLogs.action, "authentication.%");
  if (module === "security") return or(like(auditLogs.action, "authorization.%"), like(auditLogs.action, "sensitive_data.%"));
  if (module === "accounts") return like(auditLogs.action, "account.%");
  if (module === "master_data") return like(auditLogs.action, "master_%");
  if (module === "activities") return like(auditLogs.action, "ga.activity.%");
  if (module === "reports") return like(auditLogs.action, "report.%");
  if (module === "surveys") return like(auditLogs.action, "survey.%");
  if (module === "backups") return like(auditLogs.action, "backup_%");
  if (module === "requests") {
    return or(
      like(auditLogs.action, "request.%"),
      like(auditLogs.action, "issue.%"),
      like(auditLogs.action, "approval.%"),
      eq(auditLogs.action, "submitted"),
    );
  }
  return undefined;
}

export async function getAuditLogRecords(filters: AuditLogFilters) {
  await requireAdministrator();

  const conditions: SQL[] = [];
  const query = filters.query.trim().slice(0, 120);
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(or(
      ilike(auditLogs.action, pattern),
      ilike(auditLogs.entityType, pattern),
      ilike(auditLogs.entityId, pattern),
      ilike(auditLogs.actorId, pattern),
      ilike(technicians.name, pattern),
      ilike(technicians.username, pattern),
    )!);
  }
  const selectedModule = moduleCondition(filters.module);
  if (selectedModule) conditions.push(selectedModule);
  const selectedEvent = eventCondition(filters.event);
  if (selectedEvent) conditions.push(selectedEvent);
  if (filters.actorType) conditions.push(eq(auditLogs.actorType, filters.actorType));
  if (filters.period === "24h") {
    conditions.push(gte(auditLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  }
  if (validDate(filters.fromDate)) {
    conditions.push(gte(auditLogs.createdAt, new Date(`${filters.fromDate}T00:00:00+07:00`)));
  }
  if (validDate(filters.toDate)) {
    const nextDay = new Date(new Date(`${filters.toDate}T00:00:00+07:00`).getTime() + 86_400_000);
    conditions.push(lt(auditLogs.createdAt, nextDay));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const requestedPage = Number.isSafeInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const actorJoin = sql`${auditLogs.actorId} = ${technicians.id}::text`;
  const [{ total }] = await db
    .select({ total: count() })
    .from(auditLogs)
    .leftJoin(technicians, actorJoin)
    .where(where);
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_LOG_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rows = await db
    .select({
      id: auditLogs.id,
      actorType: auditLogs.actorType,
      actorId: auditLogs.actorId,
      actorName: technicians.name,
      actorUsername: technicians.username,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(technicians, actorJoin)
    .where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(AUDIT_LOG_PAGE_SIZE)
    .offset((page - 1) * AUDIT_LOG_PAGE_SIZE);

  return {
    records: rows.map((row): AuditLogRecord => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    page,
    total,
    totalPages,
  };
}

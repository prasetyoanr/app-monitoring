import "server-only";

import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { isITDivisionName, requireAuthenticatedUser, type AuthenticatedUser } from "@/auth/session";
import { getAdminOperationRecords } from "@/data/admin-operations";
import { AUDIT_LOG_EXPORT_LIMIT, getAuditLogExportRecords } from "@/data/audit-log-data";
import { canKeepGaWorkPlan, roleMayKeepGaWorkPlan } from "@/data/ga-workspace";
import { serviceInboxScope } from "@/data/issue-scope";
import { getSystemHealth } from "@/data/system-health";
import { db } from "@/db";
import {
  gaWorkPlanItems,
  masterDivisions,
  requestWorkflowHistory,
  technicians,
  troubleshootingIssues as issues,
} from "@/db/schema";
import { adminOperationsSheet, logSheet, systemHealthSheet } from "@/lib/admin-report-sheets";
import { issueStatusLabel } from "@/lib/issue-status";
import { jakartaDateTimeInput } from "@/lib/jakarta-date";
import { requestWorkflowLabel } from "@/lib/request-workflow";
import {
  REPORT_ROW_LIMIT,
  availableReportTypes,
  planStatusLabels,
  planSummary,
  planTone,
  resolveReportPeriod,
  sourcesForType,
  ticketSummary,
  ticketTone,
  uniqueSheetName,
  type ReportCell,
  type ReportColumn,
  type ReportPeriodInput,
  type ReportSheet,
  type ReportSource,
  type ReportTone,
  type ReportViewer,
  type RoleReportType,
} from "@/lib/role-report";

export class ReportRequestError extends Error {
  constructor(message: string, readonly status: 400 | 403 = 400) {
    super(message);
  }
}

export interface RoleReportBundle {
  sheets: ReportSheet[];
  totalRows: number;
  periodLabel: string;
  viewerName: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const actionLabels: Record<string, string> = {
  submitted: "Submitted",
  routed_directly: "Routed directly",
  sent_for_approval: "Sent for approval",
  approved: "Approved",
  escalated: "Escalated",
  final_approved: "Final approval",
  returned: "Returned",
  rejected: "Rejected",
  assigned: "Assigned",
  resolved: "Resolved",
};

function displayDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function displayDateTime(date: Date) {
  const value = jakartaDateTimeInput(date);
  return `${displayDate(value)} ${value.slice(11, 16)}`;
}

function viewerFor(user: AuthenticatedUser): ReportViewer {
  return {
    role: user.role,
    keepsGaPlan:
      roleMayKeepGaWorkPlan(user.role) &&
      canKeepGaWorkPlan(user.divisionSlug) &&
      !isITDivisionName(user.divisionName),
  };
}

function inPeriod(period: { start: string; end: string }) {
  return sql`(${issues.reportedAt} at time zone 'Asia/Jakarta')::date between ${period.start}::date and ${period.end}::date`;
}

function guardLimit<T>(rows: T[]): T[] {
  if (rows.length > REPORT_ROW_LIMIT) {
    throw new ReportRequestError(`This report has more than ${REPORT_ROW_LIMIT.toLocaleString("en-US")} rows. Choose a shorter period.`);
  }
  return rows;
}

const ticketCommon = {
  id: issues.id,
  title: issues.title,
  category: issues.category,
  location: issues.location,
  priority: issues.priority,
  status: issues.status,
  reportedAt: issues.reportedAt,
  completedDays: issues.completedDays,
  completionDate: issues.completionDate,
  workflowStatus: issues.workflowStatus,
  workflowEnabled: issues.workflowEnabled,
  requesterName: issues.requesterName,
  division: issues.division,
  serviceDivision: issues.serviceDivision,
  receivingDivisionId: issues.receivingDivisionId,
};

function stageOf(row: { workflowEnabled: boolean; workflowStatus: Parameters<typeof requestWorkflowLabel>[0] }) {
  return row.workflowEnabled ? requestWorkflowLabel(row.workflowStatus) : "—";
}

function toneOf(row: { status: string; workflowEnabled: boolean; workflowStatus: string }): ReportTone {
  return ticketTone({ status: row.status, workflowRejected: row.workflowEnabled && row.workflowStatus === "rejected" });
}

// ---------- Request: what the account submitted (administrator: every division request) ----------
async function requestSheet(user: AuthenticatedUser, period: { start: string; end: string }, used: Set<string>): Promise<ReportSheet> {
  const isAdmin = user.role === "administrator";
  const rows = guardLimit(await db
    .select(ticketCommon)
    .from(issues)
    .where(and(
      isAdmin ? eq(issues.source, "division_request") : eq(issues.requesterId, user.id),
      inPeriod(period),
    ))
    .orderBy(desc(issues.reportedAt), desc(issues.id))
    .limit(REPORT_ROW_LIMIT + 1));

  const columns: ReportColumn[] = [
    { header: "No.", key: "no", width: 6, align: "center" },
    { header: "ID", key: "id", width: 18 },
    { header: "Date", key: "date", width: 12, align: "center" },
    ...(isAdmin ? [
      { header: "Requester", key: "requester", width: 22 },
      { header: "Requester division", key: "division", width: 20 },
    ] : []),
    { header: "Destination", key: "destination", width: 22 },
    { header: "Request", key: "title", width: 40, wrap: true },
    { header: "Category", key: "category", width: 16 },
    { header: "Location", key: "location", width: 14 },
    { header: "Priority", key: "priority", width: 10, align: "center" },
    { header: "Stage", key: "stage", width: 26 },
    { header: "Status", key: "status", width: 18, align: "center", status: true },
    { header: "Completed on", key: "completedOn", width: 13, align: "center" },
    { header: "Days to complete", key: "days", width: 12, align: "center" },
  ];
  const tones = rows.map(toneOf);
  return {
    name: uniqueSheetName("Request", used),
    title: isAdmin ? "Request — all requests" : "Request — submitted by you",
    summary: ticketSummary(rows.map((row, index) => ({ tone: tones[index], completedDays: row.completedDays }))),
    columns,
    tones,
    rows: rows.map((row, index): Record<string, ReportCell> => ({
      no: index + 1,
      id: row.id,
      date: displayDate(jakartaDateTimeInput(row.reportedAt)),
      requester: row.requesterName,
      division: row.division,
      destination: row.receivingDivisionId ? `GA → ${row.serviceDivision}` : row.serviceDivision,
      title: row.title,
      category: row.category,
      location: row.location,
      priority: row.priority,
      stage: stageOf(row),
      status: row.workflowEnabled && row.workflowStatus === "rejected" ? "Rejected" : issueStatusLabel(row.status),
      completedOn: row.completionDate ? displayDate(row.completionDate) : "—",
      days: row.completedDays,
    })),
  };
}

// ---------- Inbox: history of what the account handled ----------
async function inboxSheet(user: AuthenticatedUser, period: { start: string; end: string }, used: Set<string>): Promise<ReportSheet> {
  const isAdmin = user.role === "administrator";
  const isAgent = user.role === "service_agent";
  const assignee = alias(technicians, "report_assignee");

  const handled = isAdmin
    ? undefined
    : isAgent
      ? or(serviceInboxScope(user), eq(issues.assignedTechnicianId, user.id))
      : or(
          inArray(issues.id, db.select({ id: requestWorkflowHistory.issueId }).from(requestWorkflowHistory).where(eq(requestWorkflowHistory.actorId, user.id))),
          eq(issues.assignedTechnicianId, user.id),
        );

  const rows = guardLimit(await db
    .select({ ...ticketCommon, handler: assignee.name })
    .from(issues)
    .leftJoin(assignee, eq(issues.assignedTechnicianId, assignee.id))
    .where(and(handled, inPeriod(period)))
    .orderBy(desc(issues.reportedAt), desc(issues.id))
    .limit(REPORT_ROW_LIMIT + 1));

  // Latest action by this account per request (history is only meaningful for reviewers).
  const showActions = !isAdmin && !isAgent;
  const lastAction = new Map<string, { action: string; at: Date }>();
  if (showActions && rows.length) {
    const history = await db
      .select({ issueId: requestWorkflowHistory.issueId, action: requestWorkflowHistory.action, createdAt: requestWorkflowHistory.createdAt })
      .from(requestWorkflowHistory)
      .where(and(eq(requestWorkflowHistory.actorId, user.id), inArray(requestWorkflowHistory.issueId, rows.map((row) => row.id))))
      .orderBy(desc(requestWorkflowHistory.createdAt));
    for (const entry of history) {
      if (!lastAction.has(entry.issueId)) lastAction.set(entry.issueId, { action: entry.action, at: entry.createdAt });
    }
  }

  const columns: ReportColumn[] = [
    { header: "No.", key: "no", width: 6, align: "center" },
    { header: "ID", key: "id", width: 18 },
    { header: "Date", key: "date", width: 12, align: "center" },
    { header: "Requester", key: "requester", width: 22 },
    { header: "Division", key: "division", width: 20 },
    { header: "Issue", key: "title", width: 40, wrap: true },
    { header: "Category", key: "category", width: 16 },
    { header: "Stage", key: "stage", width: 26 },
    { header: "Status", key: "status", width: 18, align: "center", status: true },
    { header: "Handled by", key: "handler", width: 20 },
    ...(showActions ? [
      { header: "Your action", key: "action", width: 18 },
      { header: "Action date", key: "actionAt", width: 17, align: "center" as const },
    ] : []),
    { header: "Completed on", key: "completedOn", width: 13, align: "center" },
    { header: "Days to complete", key: "days", width: 12, align: "center" },
  ];
  const tones = rows.map(toneOf);
  return {
    name: uniqueSheetName("Inbox", used),
    title: isAdmin ? "Inbox — all requests" : "Inbox — handled history",
    summary: ticketSummary(rows.map((row, index) => ({ tone: tones[index], completedDays: row.completedDays }))),
    columns,
    tones,
    rows: rows.map((row, index): Record<string, ReportCell> => {
      const mine = lastAction.get(row.id);
      return {
        no: index + 1,
        id: row.id,
        date: displayDate(jakartaDateTimeInput(row.reportedAt)),
        requester: row.requesterName,
        division: row.division,
        title: row.title,
        category: row.category,
        stage: stageOf(row),
        status: row.workflowEnabled && row.workflowStatus === "rejected" ? "Rejected" : issueStatusLabel(row.status),
        handler: row.handler ?? "—",
        action: mine ? actionLabels[mine.action] ?? mine.action : "—",
        actionAt: mine ? displayDateTime(mine.at) : "—",
        completedOn: row.completionDate ? displayDate(row.completionDate) : "—",
        days: row.completedDays,
      };
    }),
  };
}

// ---------- GA Activity: work plans ----------
const planColumns: ReportColumn[] = [
  { header: "No.", key: "no", width: 6, align: "center" },
  { header: "Period (Fri–Thu)", key: "period", width: 22 },
  { header: "Work plan", key: "title", width: 36, wrap: true },
  { header: "Description", key: "description", width: 46, wrap: true },
  { header: "Target", key: "target", width: 16, align: "center" },
  { header: "Status", key: "status", width: 14, align: "center", status: true },
  { header: "Last updated", key: "updated", width: 17, align: "center" },
];

async function gaActivitySheets(user: AuthenticatedUser, period: { start: string; end: string }, used: Set<string>, memberId: string): Promise<ReportSheet[]> {
  const isAdmin = user.role === "administrator";
  const rows = guardLimit(await db
    .select({
      memberId: gaWorkPlanItems.memberId,
      member: technicians.name,
      division: masterDivisions.name,
      weekStart: gaWorkPlanItems.weekStart,
      targetMode: gaWorkPlanItems.targetMode,
      targetDate: gaWorkPlanItems.targetDate,
      title: gaWorkPlanItems.title,
      description: gaWorkPlanItems.description,
      status: gaWorkPlanItems.status,
      updatedAt: gaWorkPlanItems.updatedAt,
    })
    .from(gaWorkPlanItems)
    .innerJoin(technicians, eq(gaWorkPlanItems.memberId, technicians.id))
    .innerJoin(masterDivisions, eq(gaWorkPlanItems.divisionId, masterDivisions.id))
    .where(and(
      isAdmin ? (memberId ? eq(gaWorkPlanItems.memberId, memberId) : undefined) : eq(gaWorkPlanItems.memberId, user.id),
      sql`${gaWorkPlanItems.weekStart}::date <= ${period.end}::date`,
      sql`(${gaWorkPlanItems.weekStart}::date + 6) >= ${period.start}::date`,
    ))
    .orderBy(asc(technicians.name), asc(gaWorkPlanItems.weekStart), asc(gaWorkPlanItems.createdAt))
    .limit(REPORT_ROW_LIMIT + 1));

  const weekEnd = (weekStart: string) => {
    const date = new Date(`${weekStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 6);
    return date.toISOString().slice(0, 10);
  };
  const toRow = (row: (typeof rows)[number], index: number): Record<string, ReportCell> => ({
    no: index + 1,
    period: `${displayDate(row.weekStart)} – ${displayDate(weekEnd(row.weekStart))}`,
    title: row.title,
    description: row.description || "—",
    target: row.targetMode === "until_completed" ? "Until done" : row.targetDate ? displayDate(row.targetDate) : "—",
    status: planStatusLabels[row.status] ?? row.status,
    updated: displayDateTime(row.updatedAt),
  });

  if (!isAdmin) {
    return [{
      name: uniqueSheetName("GA Activity", used),
      title: "GA Activity — your work plans",
      summary: planSummary(rows),
      columns: planColumns,
      tones: rows.map((row) => planTone(row.status)),
      rows: rows.map(toRow),
    }];
  }

  // Administrator: one tab per member, then a per-member overview.
  const byMember = new Map<string, typeof rows>();
  for (const row of rows) byMember.set(row.memberId, [...(byMember.get(row.memberId) ?? []), row]);
  const memberSheets: ReportSheet[] = [...byMember.values()].map((memberRows) => ({
    name: uniqueSheetName(memberRows[0].member, used),
    title: `GA Activity — ${memberRows[0].member} (${memberRows[0].division})`,
    summary: planSummary(memberRows),
    columns: planColumns,
    tones: memberRows.map((row) => planTone(row.status)),
    rows: memberRows.map(toRow),
  }));
  const overviewRows = [...byMember.values()].map((memberRows, index) => {
    const summary = planSummary(memberRows);
    return { no: index + 1, member: memberRows[0].member, division: memberRows[0].division, total: memberRows.length, completed: Number(summary[1].value), inProgress: Number(summary[2].value), planned: Number(summary[3].value), completion: summary[4].value };
  });
  const overview: ReportSheet = {
    name: uniqueSheetName("GA members", used),
    title: "GA Activity — members overview",
    summary: [{ label: "Members with plans", value: String(overviewRows.length) }, ...planSummary(rows).slice(0, 2)],
    columns: [
      { header: "No.", key: "no", width: 6, align: "center" },
      { header: "Member", key: "member", width: 26 },
      { header: "Division", key: "division", width: 22 },
      { header: "Total plans", key: "total", width: 12, align: "center" },
      { header: "Completed", key: "completed", width: 12, align: "center" },
      { header: "In progress", key: "inProgress", width: 12, align: "center" },
      { header: "Planned", key: "planned", width: 12, align: "center" },
      { header: "Completion", key: "completion", width: 12, align: "center" },
    ],
    tones: overviewRows.map(() => "none" as const),
    rows: overviewRows,
  };
  return [overview, ...memberSheets];
}

// ---------- entry point ----------
export async function buildRoleReport(input: {
  type: RoleReportType;
  period: ReportPeriodInput;
  memberId?: string;
}): Promise<RoleReportBundle> {
  return buildRoleReportForUser(await requireAuthenticatedUser(), input);
}

// The account always comes from the session; this split only lets the scoping be
// exercised directly without a browser session.
export async function buildRoleReportForUser(user: AuthenticatedUser, input: {
  type: RoleReportType;
  period: ReportPeriodInput;
  memberId?: string;
}): Promise<RoleReportBundle> {
  const viewer = viewerFor(user);
  const sources = sourcesForType(input.type, viewer);
  if (!sources.length) throw new ReportRequestError("Your role cannot export this report.", 403);

  const period = resolveReportPeriod(input.period);
  if (!period) throw new ReportRequestError("Choose a valid month or date range.");

  const memberId = user.role === "administrator" ? (input.memberId ?? "").trim() : "";
  if (memberId && !uuidPattern.test(memberId)) throw new ReportRequestError("Choose a valid GA member.");

  const used = new Set<string>(["summary"]);
  const sheets: ReportSheet[] = [];
  const builders: Record<ReportSource, () => Promise<ReportSheet[]>> = {
    request: async () => [await requestSheet(user, period, used)],
    inbox: async () => [await inboxSheet(user, period, used)],
    ga_activity: () => gaActivitySheets(user, period, used, memberId),
    // Administrator-only; each loader re-checks the administrator role itself.
    log: async () => {
      const result = await getAuditLogExportRecords({
        query: "", module: "", event: "", actorType: "", period: "",
        fromDate: period.start, toDate: period.end, page: 1,
      });
      if (result.truncated) {
        throw new ReportRequestError(`The log has more than ${AUDIT_LOG_EXPORT_LIMIT.toLocaleString("en-US")} events in this period. Choose a shorter period.`);
      }
      return [logSheet(uniqueSheetName("Log", used), result.records)];
    },
    // A snapshot of the current state: the chosen period does not apply.
    utility: async () => {
      const [operations, health] = await Promise.all([getAdminOperationRecords(), getSystemHealth()]);
      return [
        adminOperationsSheet(uniqueSheetName("Admin operations", used), operations),
        systemHealthSheet(uniqueSheetName("System health", used), health),
      ];
    },
  };
  for (const source of sources) sheets.push(...await builders[source]());

  const dataSheets = [...sheets];
  if (sheets.length > 1) {
    sheets.unshift({
      name: "Summary",
      title: "Summary",
      summary: [],
      columns: [
        { header: "Tab", key: "tab", width: 30 },
        { header: "Report", key: "report", width: 40 },
        { header: "Records", key: "records", width: 12, align: "center" },
      ],
      tones: dataSheets.map(() => "none" as const),
      rows: dataSheets.map((sheet) => ({ tab: sheet.name, report: sheet.title, records: sheet.rows.length })),
    });
  }

  return {
    sheets,
    totalRows: dataSheets.reduce((sum, sheet) => sum + sheet.rows.length, 0),
    periodLabel: period.label,
    viewerName: user.name || user.username,
  };
}

export async function listReportGaMembers() {
  const user = await requireAuthenticatedUser();
  if (user.role !== "administrator") return [];
  const rows = await db
    .select({ id: technicians.id, name: technicians.name })
    .from(gaWorkPlanItems)
    .innerJoin(technicians, eq(gaWorkPlanItems.memberId, technicians.id))
    .groupBy(technicians.id, technicians.name)
    .orderBy(asc(technicians.name));
  return rows;
}

export async function reportViewerCapabilities() {
  const user = await requireAuthenticatedUser();
  const viewer = viewerFor(user);
  return { viewer, types: availableReportTypes(viewer) };
}

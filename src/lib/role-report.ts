import type { AccountRole } from "@/data/types";
import { isDateInput, reportingPeriodStartForDate, shiftDate } from "@/lib/ga-work-plan";

// Shared by the server (data + workbook) and the client (preview table).
export type ReportSource = "request" | "inbox" | "ga_activity" | "log" | "utility";
export type RoleReportType = ReportSource | "all";
export type ReportTone = "ok" | "wait" | "bad" | "run" | "none";

export interface ReportViewer {
  role: AccountRole;
  /** Division is General Affairs (and not IT), so the account keeps a work plan. */
  keepsGaPlan: boolean;
}

export interface ReportColumn {
  header: string;
  key: string;
  width: number;
  align?: "left" | "center";
  /** The cell is a status and gets a tone colour. */
  status?: boolean;
  wrap?: boolean;
}

export type ReportCell = string | number | null;

export interface ReportSummaryItem {
  label: string;
  value: string;
}

export interface ReportSheet {
  /** Excel tab name, already sanitised and unique inside the workbook. */
  name: string;
  title: string;
  summary: ReportSummaryItem[];
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>>;
  /** Row key → tone, for the status column. */
  tones: ReportTone[];
}

export const REPORT_ROW_LIMIT = 20_000;

export const reportTypeLabels: Record<RoleReportType, string> = {
  request: "Request",
  inbox: "Inbox",
  ga_activity: "GA Activity",
  log: "Log",
  utility: "Utility",
  all: "All",
};

export const reportTypeDescriptions: Record<RoleReportType, string> = {
  request: "Requests you submitted to other units.",
  inbox: "Requests you handled, with your action and date.",
  ga_activity: "Work plans you recorded in GA Activity.",
  log: "Activity log of sign-ins, changes and exports.",
  utility: "Snapshot of Admin Operations and System Health.",
  all: "Every report you can access, as tabs in one file.",
};

// Requesters have no reports. The administrator sees everything; other roles only
// their own data, and GA Activity only when their division is General Affairs.
export function availableReportTypes(viewer: ReportViewer): RoleReportType[] {
  if (viewer.role === "requester") return [];
  const sources: ReportSource[] = ["request", "inbox"];
  if (viewer.role === "administrator" || viewer.keepsGaPlan) sources.push("ga_activity");
  // Log and Utility are administrator-only.
  if (viewer.role === "administrator") sources.push("log", "utility");
  return [...sources, "all"];
}

export function sourcesForType(type: RoleReportType, viewer: ReportViewer): ReportSource[] {
  const allowed = availableReportTypes(viewer);
  if (!allowed.includes(type)) return [];
  if (type === "all") return allowed.filter((item): item is ReportSource => item !== "all");
  return [type];
}

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const monthOnly = /^\d{4}-(?:0[1-9]|1[0-2])$/;

// "date" and "period" follow the GA Activity date picker: one day, or the Friday–Thursday
// reporting period that contains the chosen reference date.
export type ReportPeriodInput =
  | { mode: "month"; month: string }
  | { mode: "range"; startDate: string; endDate: string }
  | { mode: "date"; date: string }
  | { mode: "period"; date: string };

// Report types that use the GA Activity style date picker instead of month / range.
export function usesStaffDatePicker(type: RoleReportType) {
  return type === "ga_activity" || type === "all";
}

export function resolveReportPeriod(input: ReportPeriodInput): { start: string; end: string; label: string } | null {
  if (input.mode === "date") {
    return isDateInput(input.date) ? { start: input.date, end: input.date, label: input.date } : null;
  }
  if (input.mode === "period") {
    if (!isDateInput(input.date)) return null;
    const start = reportingPeriodStartForDate(input.date);
    const end = shiftDate(start, 6);
    return { start, end, label: `${start}_to_${end}` };
  }
  if (input.mode === "month") {
    if (!monthOnly.test(input.month)) return null;
    const [year, month] = input.month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { start: `${input.month}-01`, end: `${input.month}-${String(lastDay).padStart(2, "0")}`, label: input.month };
  }
  if (!dateOnly.test(input.startDate) || !dateOnly.test(input.endDate) || input.startDate > input.endDate) return null;
  // Reject impossible dates such as 2026-02-31.
  for (const value of [input.startDate, input.endDate]) {
    if (new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) return null;
  }
  return { start: input.startDate, end: input.endDate, label: `${input.startDate}_to_${input.endDate}` };
}

// Excel tab names: at most 31 characters, none of \ / ? * [ ] :, unique per workbook.
export function uniqueSheetName(raw: string, used: Set<string>): string {
  const base = (raw.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim() || "Sheet").slice(0, 31);
  let name = base;
  let counter = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${counter++})`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

export function ticketTone(input: { status: string; workflowRejected: boolean }): ReportTone {
  if (input.workflowRejected) return "bad";
  if (input.status === "Completed") return "ok";
  if (input.status === "In Progress") return "run";
  return "wait";
}

export function planTone(status: string): ReportTone {
  if (status === "completed") return "ok";
  if (status === "in_progress") return "run";
  if (status === "cancelled") return "bad";
  return "wait";
}

export const planStatusLabels: Record<string, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function ticketSummary(rows: Array<{ tone: ReportTone; completedDays: number | null }>): ReportSummaryItem[] {
  const done = rows.filter((row) => row.tone === "ok");
  const inProgress = rows.filter((row) => row.tone === "run" || row.tone === "wait").length;
  const rejected = rows.filter((row) => row.tone === "bad").length;
  const days = done.map((row) => row.completedDays).filter((value): value is number => typeof value === "number");
  const average = days.length ? (days.reduce((sum, value) => sum + value, 0) / days.length).toFixed(1) : "—";
  return [
    { label: "Total", value: String(rows.length) },
    { label: "Completed", value: String(done.length) },
    { label: "In progress", value: String(inProgress) },
    { label: "Rejected", value: String(rejected) },
    { label: "Avg. days to complete", value: average },
  ];
}

export function planSummary(rows: Array<{ status: string }>): ReportSummaryItem[] {
  const count = (status: string) => rows.filter((row) => row.status === status).length;
  const completed = count("completed");
  const counted = rows.length - count("cancelled");
  return [
    { label: "Total plans", value: String(rows.length) },
    { label: "Completed", value: String(completed) },
    { label: "In progress", value: String(count("in_progress")) },
    { label: "Planned", value: String(count("planned")) },
    { label: "Completion", value: counted ? `${Math.round((completed / counted) * 100)}%` : "—" },
  ];
}

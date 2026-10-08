import { getCurrentUser } from "@/auth/session";
import { ReportRequestError, buildRoleReport } from "@/data/role-reports";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { buildReportWorkbook } from "@/lib/report-workbook";
import type { ReportPeriodInput, RoleReportType } from "@/lib/role-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const types: readonly RoleReportType[] = ["request", "inbox", "ga_activity", "log", "utility", "all"];

function field(form: FormData, name: string, max = 64) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function problem(message: string, status: number) {
  return new Response(message, { status, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
}

function jakartaStamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";
  return { file: `${part("year")}${part("month")}${part("day")}-${part("hour")}${part("minute")}`, label: `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")} WIB` };
}

// POST only, same-origin: the download is built on the server and limited to what the
// signed-in account may see. Scope is decided in buildRoleReport, never by form fields.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return problem("Forbidden.", 403);

  const user = await getCurrentUser();
  if (!user) return problem("Please sign in again.", 401);

  const form = await request.formData();
  const type = field(form, "type") as RoleReportType;
  if (!types.includes(type)) return problem("Invalid report type.", 400);
  const mode = field(form, "mode");
  const period: ReportPeriodInput = mode === "range"
    ? { mode: "range", startDate: field(form, "startDate", 10), endDate: field(form, "endDate", 10) }
    : mode === "date" || mode === "period"
      ? { mode, date: field(form, "date", 10) }
      : { mode: "month", month: field(form, "month", 7) };

  try {
    const bundle = await buildRoleReport({ type, period, memberId: field(form, "member", 36) });
    const stamp = jakartaStamp();
    const file = await buildReportWorkbook(bundle.sheets, {
      periodLabel: bundle.periodLabel.replace("_to_", " to "),
      generatedBy: bundle.viewerName,
      generatedAt: stamp.label,
    });

    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: user.id,
      action: "report.exported",
      entityType: "report",
      entityId: type,
      metadata: { format: "xlsx", period: bundle.periodLabel, recordCount: bundle.totalRows, tabs: bundle.sheets.length },
    });

    return new Response(new Uint8Array(file), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="report-${type}-${bundle.periodLabel}-${stamp.file}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ReportRequestError) return problem(error.message, error.status);
    console.error("Unable to build the report export.", error);
    return problem("The report could not be created.", 500);
  }
}

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isITDivisionName, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, gaSpreadsheetReports, gaSpreadsheetReportViewers, masterDivisions, technicians } from "@/db/schema";
import { canViewGaSpreadsheet, isGaSpreadsheetEligible, normalizeGoogleSpreadsheetUrl } from "@/lib/ga-spreadsheet";
import { recordAuthorizationDenied } from "@/security/audit";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const user = await requireAuthenticatedUser();
  let reportId = request.nextUrl.searchParams.get("report") ?? "";
  // Existing bookmarks used the member ID while each member had one report.
  if (!reportId) {
    const memberId = request.nextUrl.searchParams.get("member") ?? "";
    if (!uuidPattern.test(memberId)) return new Response("Spreadsheet report was not found.", { status: 404 });
    const [legacyReport] = await db.select({ id: gaSpreadsheetReports.id }).from(gaSpreadsheetReports)
      .where(eq(gaSpreadsheetReports.ownerId, memberId)).orderBy(gaSpreadsheetReports.createdAt).limit(1);
    reportId = legacyReport?.id ?? "";
  }
  if (!uuidPattern.test(reportId)) return new Response("Spreadsheet report was not found.", { status: 404 });

  const [report] = await db
    .select({
      id: gaSpreadsheetReports.id,
      ownerId: gaSpreadsheetReports.ownerId,
      title: gaSpreadsheetReports.title,
      url: gaSpreadsheetReports.url,
      name: technicians.name,
      role: technicians.role,
      isActive: technicians.isActive,
      spreadsheetEnabled: technicians.spreadsheetEnabled,
      divisionName: masterDivisions.name,
      divisionSlug: masterDivisions.slug,
      isGaUnit: masterDivisions.isGaUnit,
    })
    .from(gaSpreadsheetReports)
    .innerJoin(technicians, eq(gaSpreadsheetReports.ownerId, technicians.id))
    .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(and(
      eq(gaSpreadsheetReports.id, reportId),
      eq(technicians.isActive, true),
    ))
    .limit(1);

  const isOwner = user.id === report?.ownerId;
  const isAdmin = user.role === "administrator";
  const eligibleViewer = isGaSpreadsheetEligible({
    role: user.role,
    isActive: true,
    isGaUnit: user.isGaUnit ?? false,
    divisionSlug: user.divisionSlug,
    isIt: isITDivisionName(user.divisionName),
  });
  const [grant] = !isAdmin && !isOwner && eligibleViewer
    ? await db.select({ viewerId: gaSpreadsheetReportViewers.viewerId }).from(gaSpreadsheetReportViewers)
      .where(and(eq(gaSpreadsheetReportViewers.reportId, reportId), eq(gaSpreadsheetReportViewers.viewerId, user.id))).limit(1)
    : [];
  const allowedViewer = canViewGaSpreadsheet({
    role: user.role, isEligible: eligibleViewer, isOwner, hasGrant: Boolean(grant),
  });
  const available = Boolean(
    report &&
    isGaSpreadsheetEligible({ ...report, isIt: isITDivisionName(report.divisionName) }) &&
    report.spreadsheetEnabled,
  );
  if (!allowedViewer || !available) {
    await recordAuthorizationDenied(user, "ga.spreadsheet.open", { reportId });
    return new Response("Spreadsheet access is not available.", { status: 403 });
  }

  let destination: string;
  try {
    destination = normalizeGoogleSpreadsheetUrl(report!.url);
  } catch {
    return new Response("The saved spreadsheet link is invalid.", { status: 422 });
  }

  await db.insert(auditLogs).values({
    actorType: "technician",
    actorId: user.id,
    action: "ga.spreadsheet.opened",
    entityType: "ga_spreadsheet_report",
    entityId: reportId,
    metadata: { memberName: report!.name, reportTitle: report!.title, ownerId: report!.ownerId },
  });

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

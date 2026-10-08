import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isITDivisionName, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, masterDivisions, technicians } from "@/db/schema";
import { normalizeGoogleSpreadsheetUrl } from "@/lib/ga-spreadsheet";
import { recordAuthorizationDenied } from "@/security/audit";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const user = await requireAuthenticatedUser();
  const memberId = request.nextUrl.searchParams.get("member") ?? "";
  if (!uuidPattern.test(memberId)) return new Response("Spreadsheet report was not found.", { status: 404 });

  const [member] = await db
    .select({
      id: technicians.id,
      name: technicians.name,
      role: technicians.role,
      isActive: technicians.isActive,
      spreadsheetEnabled: technicians.spreadsheetEnabled,
      spreadsheetUrl: technicians.spreadsheetUrl,
      divisionName: masterDivisions.name,
      isGaUnit: masterDivisions.isGaUnit,
    })
    .from(technicians)
    .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(and(
      eq(technicians.id, memberId),
      eq(technicians.role, "service_agent"),
      eq(technicians.isActive, true),
    ))
    .limit(1);

  const allowedViewer = user.role === "administrator" || (user.role === "service_agent" && user.id === memberId);
  const available = Boolean(
    member &&
    member.isGaUnit &&
    !isITDivisionName(member.divisionName) &&
    member.spreadsheetEnabled &&
    member.spreadsheetUrl,
  );
  if (!allowedViewer || !available) {
    await recordAuthorizationDenied(user, "ga.spreadsheet.open", { memberId });
    return new Response("Spreadsheet access is not available.", { status: 403 });
  }

  let destination: string;
  try {
    destination = normalizeGoogleSpreadsheetUrl(member!.spreadsheetUrl!);
  } catch {
    return new Response("The saved spreadsheet link is invalid.", { status: 422 });
  }

  await db.insert(auditLogs).values({
    actorType: "technician",
    actorId: user.id,
    action: "ga.spreadsheet.opened",
    entityType: "technician",
    entityId: memberId,
    metadata: { memberName: member!.name },
  });

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

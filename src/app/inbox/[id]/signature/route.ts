import { and, desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/auth/session";
import { canViewServiceIssue } from "@/auth/issue-access";
import { db } from "@/db";
import { troubleshootingApprovals, troubleshootingIssues } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!/^(?:INC-[0-9]{4}-[0-9]{4,6}|TR-[0-9]{4}-[0-9]{4})$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const [signature] = await db
    .select({
      data: troubleshootingApprovals.signatureData,
      mimeType: troubleshootingApprovals.signatureMimeType,
      respondedAt: troubleshootingApprovals.respondedAt,
      requesterId: troubleshootingIssues.requesterId,
      requesterDivision: troubleshootingIssues.division,
      serviceDivisionId: troubleshootingIssues.serviceDivisionId,
    })
    .from(troubleshootingApprovals)
    .innerJoin(troubleshootingIssues, eq(troubleshootingApprovals.issueId, troubleshootingIssues.id))
    .where(
      and(
        eq(troubleshootingApprovals.issueId, id),
        eq(troubleshootingApprovals.status, "approved"),
      ),
    )
    .orderBy(desc(troubleshootingApprovals.respondedAt))
    .limit(1);

  if (
    !signature?.data ||
    signature.mimeType !== "image/png" ||
    !signature.respondedAt ||
    !canViewServiceIssue(currentUser, signature)
  ) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(signature.data), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(signature.data.length),
      "Content-Type": signature.mimeType,
      "Last-Modified": signature.respondedAt.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

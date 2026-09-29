import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/auth/session";
import { canViewServiceIssue } from "@/auth/issue-access";
import { db } from "@/db";
import { troubleshootingIssues } from "@/db/schema";
import { recordAuthorizationDenied, recordSensitiveDataAccess } from "@/security/audit";

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

  const [photo] = await db
    .select({
      data: troubleshootingIssues.requesterPhotoData,
      mimeType: troubleshootingIssues.requesterPhotoMimeType,
      updatedAt: troubleshootingIssues.updatedAt,
      requesterId: troubleshootingIssues.requesterId,
      requesterDivision: troubleshootingIssues.division,
      source: troubleshootingIssues.source,
      workflowEnabled: troubleshootingIssues.workflowEnabled,
      workflowStatus: troubleshootingIssues.workflowStatus,
      assignedTechnicianId: troubleshootingIssues.assignedTechnicianId,
      approverId: troubleshootingIssues.approverId,
      finalApproverId: troubleshootingIssues.finalApproverId,
      serviceDivisionId: troubleshootingIssues.serviceDivisionId,
    })
    .from(troubleshootingIssues)
    .where(eq(troubleshootingIssues.id, id))
    .limit(1);

  if (!photo?.data || photo.mimeType !== "image/jpeg") {
    return new Response("Not found", { status: 404 });
  }
  if (!canViewServiceIssue(currentUser, photo)) {
    await recordAuthorizationDenied(currentUser, "sensitive_data.requester_photo.view", { issueId: id });
    return new Response("Not found", { status: 404 });
  }
  await recordSensitiveDataAccess(currentUser, "troubleshooting_issue", id, "requester_photo");

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(photo.data.length),
      "Content-Type": photo.mimeType,
      "Last-Modified": photo.updatedAt.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

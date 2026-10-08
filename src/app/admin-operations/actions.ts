"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, masterDivisions, requestWorkflowHistory, technicians, troubleshootingIssues } from "@/db/schema";
import type { ActionResult } from "@/data/types";
import { adminRecoveryReasonError, canAdminReassignIssue } from "@/lib/admin-recovery";
import { canAssignRequestToUnit } from "@/lib/ga-assignment";
import { issueChangeQuery } from "@/lib/issue-event-query";

const issueIdPattern = /^(?:INC-[0-9]{4}-[0-9]{4,6}|TR-[0-9]{4}-[0-9]{4})$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function adminReassignIssueAction(input: {
  issueId: string;
  assigneeId: string;
  reason: string;
}): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireAdministrator("admin_operations.reassign");
  try {
    const issueId = input.issueId.trim();
    const assigneeId = input.assigneeId.trim();
    const reason = input.reason.trim();
    if (!issueIdPattern.test(issueId)) throw new Error("Invalid issue ID.");
    if (!uuidPattern.test(assigneeId)) throw new Error("Select an active service agent.");
    const reasonError = adminRecoveryReasonError(reason);
    if (reasonError) throw new Error(reasonError);

    const [issue] = await db
      .select({
        status: troubleshootingIssues.status,
        workflowStatus: troubleshootingIssues.workflowStatus,
        workflowEnabled: troubleshootingIssues.workflowEnabled,
        receivingDivisionId: troubleshootingIssues.receivingDivisionId,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
        assignedTechnicianId: troubleshootingIssues.assignedTechnicianId,
        updatedAt: troubleshootingIssues.updatedAt,
      })
      .from(troubleshootingIssues)
      .where(eq(troubleshootingIssues.id, issueId))
      .limit(1);
    if (!issue || !issue.workflowEnabled || !canAdminReassignIssue(issue.status, issue.workflowStatus)) {
      throw new Error("Only active assigned work can be recovered by reassignment.");
    }
    if (issue.assignedTechnicianId === assigneeId) throw new Error("Select a different service agent.");

    const [assignee] = await db
      .select({
        id: technicians.id,
        divisionId: masterDivisions.id,
        division: masterDivisions.name,
        isGaUnit: masterDivisions.isGaUnit,
      })
      .from(technicians)
      .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
      .where(and(
        eq(technicians.id, assigneeId),
        eq(technicians.role, "service_agent"),
        eq(technicians.isActive, true),
      ))
      .limit(1);
    if (!assignee || !canAssignRequestToUnit(
      issue.receivingDivisionId,
      issue.serviceDivisionId,
      { id: assignee.divisionId, isGaUnit: assignee.isGaUnit },
    )) {
      throw new Error("Select active staff from an eligible execution unit.");
    }

    await db.transaction(async (tx) => {
      const [stillActive] = await tx
        .select({ id: technicians.id })
        .from(technicians)
        .where(and(
          eq(technicians.id, assignee.id),
          eq(technicians.role, "service_agent"),
          eq(technicians.isActive, true),
        ))
        .limit(1);
      if (!stillActive) throw new Error("The selected service agent is no longer active. Refresh and choose another staff account.");

      await tx.execute(issueChangeQuery(issueId));
      const [updated] = await tx
        .update(troubleshootingIssues)
        .set({
          assignedTechnicianId: assignee.id,
          serviceDivisionId: assignee.divisionId,
          serviceDivision: assignee.division,
          updatedAt: new Date(),
        })
        .where(and(
          eq(troubleshootingIssues.id, issueId),
          eq(troubleshootingIssues.workflowStatus, "assigned"),
          issue.assignedTechnicianId
            ? eq(troubleshootingIssues.assignedTechnicianId, issue.assignedTechnicianId)
            : isNull(troubleshootingIssues.assignedTechnicianId),
          sql`date_trunc('milliseconds', ${troubleshootingIssues.updatedAt}) = ${issue.updatedAt.toISOString()}::timestamptz`,
        ))
        .returning({ id: troubleshootingIssues.id });
      if (!updated) throw new Error("The request changed. Refresh the page and try again.");

      await tx.insert(requestWorkflowHistory).values({
        issueId,
        actorId: currentUser.id,
        action: "assigned",
        previousStatus: "assigned",
        status: "assigned",
        note: reason,
      });
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "request.workflow.reassigned",
        entityType: "troubleshooting_issue",
        entityId: issueId,
        metadata: {
          previousAssigneeId: issue.assignedTechnicianId,
          assigneeId: assignee.id,
          previousExecutionUnitId: issue.serviceDivisionId,
          executionUnitId: assignee.divisionId,
          reason,
        },
      });
      await tx.execute(issueChangeQuery(issueId));
    });

    revalidatePath("/");
    revalidatePath("/admin-operations");
    revalidatePath("/inbox");
    revalidatePath("/requests");
    revalidatePath("/reports");
    revalidatePath("/activities");
    return { ok: true, data: { id: issueId } };
  } catch (error) {
    console.error("Unable to recover request assignment.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to recover request assignment.",
    };
  }
}

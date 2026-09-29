"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import {
  auditLogs,
  masterDivisions,
  requestWorkflowHistory,
  requestStatusHistory,
  requestStatusNotifications,
  technicians,
  troubleshootingIssues,
} from "@/db/schema";
import type {
  ActionResult,
  RequestWorkflowCommand,
} from "@/data/types";
import { workflowNoteError, workflowTransition } from "@/lib/request-workflow";
import { issueChangeQuery } from "@/lib/issue-event-query";
import { canAssignRequestToUnit } from "@/lib/ga-assignment";
import { recordAuthorizationDenied } from "@/security/audit";

const issueIdPattern = /^(?:INC-[0-9]{4}-[0-9]{4,6}|TR-[0-9]{4}-[0-9]{4})$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type WorkflowActionInput = {
  issueId: string;
  command: RequestWorkflowCommand;
  note?: string;
  assigneeId?: string;
};

export async function updateRequestWorkflowAction(
  input: WorkflowActionInput,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  try {
    const issueId = input.issueId.trim();
    const note = input.note?.trim() ?? "";
    const assigneeId = input.assigneeId?.trim() ?? "";
    if (!issueIdPattern.test(issueId)) throw new Error("Invalid issue ID.");
    const noteError = workflowNoteError(input.command, note);
    if (noteError) throw new Error(noteError);
    if (!["administrator", "receptionist", "approver", "final_approver"].includes(currentUser.role)) {
      await recordAuthorizationDenied(currentUser, `request.workflow.${input.command}`);
      throw new Error("Your role cannot perform this workflow action.");
    }

    const [issue] = await db
      .select({
        source: troubleshootingIssues.source,
        status: troubleshootingIssues.status,
        reportedAt: troubleshootingIssues.reportedAt,
        requesterId: troubleshootingIssues.requesterId,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
        receivingDivisionId: troubleshootingIssues.receivingDivisionId,
        workflowStatus: troubleshootingIssues.workflowStatus,
        workflowEnabled: troubleshootingIssues.workflowEnabled,
        approvalRequired: troubleshootingIssues.approvalRequired,
        approverId: troubleshootingIssues.approverId,
        updatedAt: troubleshootingIssues.updatedAt,
      })
      .from(troubleshootingIssues)
      .where(eq(troubleshootingIssues.id, issueId))
      .limit(1);
    if (!issue || issue.source !== "division_request" || !issue.workflowEnabled) {
      throw new Error("The division request was not found.");
    }
    if (input.command === "resolve" && !issue.receivingDivisionId) throw new Error("Administrative resolution is only available for GA requests.");
    if (currentUser.role === "approver" && issue.approverId && issue.approverId !== currentUser.id) {
      await recordAuthorizationDenied(currentUser, `request.workflow.${input.command}`, { reason: "different_approver", issueId });
      throw new Error("This request belongs to the approver who handled its approval.");
    }
    if ((currentUser.role === "approver" || currentUser.role === "final_approver") && issue.requesterId === currentUser.id) {
      await recordAuthorizationDenied(currentUser, `request.workflow.${input.command}`, { reason: "own_request", issueId });
      throw new Error("You cannot approve your own request.");
    }
    if (currentUser.role === "final_approver" && issue.approverId === currentUser.id) {
      await recordAuthorizationDenied(currentUser, `request.workflow.${input.command}`, { reason: "same_approver", issueId });
      throw new Error("The final decision must be made by a different approver.");
    }
    const transition = workflowTransition(currentUser.role, issue.workflowStatus, issue.approvalRequired, input.command);
    if (!transition) {
      throw new Error("This action is no longer valid for the current workflow status.");
    }
    if (input.command === "send_for_approval" || input.command === "escalate") {
      const targetRole = input.command === "escalate" ? "final_approver" : "approver";
      const [recipient] = await db.select({ id: technicians.id })
        .from(technicians)
        .where(and(
          eq(technicians.role, targetRole),
          eq(technicians.isActive, true),
          issue.requesterId ? ne(technicians.id, issue.requesterId) : undefined,
          targetRole === "final_approver" ? ne(technicians.id, currentUser.id) : undefined,
        )).limit(1);
      if (!recipient) throw new Error(`No eligible active ${targetRole.replaceAll("_", " ")} is configured. Contact an administrator.`);
    }
    const needsAssignee = input.command === "direct_assign" || input.command === "assign";
    let validatedAssigneeId: string | null = null;
    let executionUnit: { id: string; name: string } | undefined;
    if (needsAssignee) {
      if (!uuidPattern.test(assigneeId)) throw new Error("Select a service agent.");
      const [assignee] = await db
        .select({ id: technicians.id, divisionId: masterDivisions.id, division: masterDivisions.name, isGaUnit: masterDivisions.isGaUnit })
        .from(technicians)
        .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
        .where(
          and(
            eq(technicians.id, assigneeId),
            eq(technicians.role, "service_agent"),
            eq(technicians.isActive, true),
          ),
        )
        .limit(1);
      if (!assignee || !canAssignRequestToUnit(issue.receivingDivisionId, issue.serviceDivisionId, { id: assignee.divisionId, isGaUnit: assignee.isGaUnit })) {
        throw new Error("Select an active member of an enabled GA unit. Historical requests must retain their destination unit.");
      }
      validatedAssigneeId = assignee.id;
      executionUnit = { id: assignee.divisionId, name: assignee.division };
    }

    await db.transaction(async (tx) => {
      // Notify both the old and new audiences, including a reviewer whose item
      // is leaving their queue. Neither signal is delivered on rollback.
      await tx.execute(issueChangeQuery(issueId));
      const [updated] = await tx
        .update(troubleshootingIssues)
        .set({
          workflowStatus: transition.status,
          status: input.command === "resolve" ? "Completed" : undefined,
          resolution: input.command === "resolve" ? note : undefined,
          completedDays: input.command === "resolve" ? Math.max(0, Math.floor((Date.now() - issue.reportedAt.getTime()) / 86_400_000)) : undefined,
          approvalRequired:
            input.command === "send_for_approval"
              ? true
              : input.command === "direct_assign"
                ? false
                : undefined,
          reviewedById:
            input.command === "send_for_approval" || input.command === "direct_assign" || (input.command === "resolve" && currentUser.role === "receptionist")
              ? currentUser.id
              : undefined,
          approverId:
            issue.workflowStatus === "waiting_approver" ? currentUser.id : undefined,
          finalApproverId:
            currentUser.role === "final_approver" ? currentUser.id : undefined,
          assignedTechnicianId: needsAssignee ? validatedAssigneeId : undefined,
          serviceDivisionId: executionUnit?.id,
          serviceDivision: executionUnit?.name,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(troubleshootingIssues.id, issueId),
            eq(troubleshootingIssues.workflowStatus, issue.workflowStatus),
            // PostgreSQL defaults retain microseconds; JS Date retains milliseconds.
            sql`date_trunc('milliseconds', ${troubleshootingIssues.updatedAt}) = ${issue.updatedAt.toISOString()}::timestamptz`,
          ),
        )
        .returning({ id: troubleshootingIssues.id });
      if (!updated) throw new Error("The request changed. Refresh the page and try again.");

      await tx.insert(requestWorkflowHistory).values({
        issueId,
        actorId: currentUser.id,
        action: transition.action,
        previousStatus: issue.workflowStatus,
        status: transition.status,
        note: note || null,
      });
      if (input.command === "resolve") {
        await tx.insert(requestStatusHistory).values({ issueId, changedById: currentUser.id, previousStatus: issue.status, status: "Completed", reason: note, requesterNote: note });
        if (issue.requesterId) await tx.insert(requestStatusNotifications).values({ issueId, recipientId: issue.requesterId, status: "Completed", requesterNote: note });
      }
      await tx.insert(auditLogs).values({
        actorType: currentUser.role === "requester" ? "requester" : "technician",
        actorId: currentUser.id,
        action: `request.workflow.${input.command}`,
        entityType: "troubleshooting_issue",
        entityId: issueId,
        metadata: {
          previousStatus: issue.workflowStatus,
          workflowStatus: transition.status,
          assigneeId: validatedAssigneeId,
          receivingDivisionId: issue.receivingDivisionId,
          executionUnitId: executionUnit?.id,
          note: note || null,
        },
      });
      await tx.execute(issueChangeQuery(issueId));
    });

    revalidatePath("/");
    revalidatePath("/inbox");
    revalidatePath("/requests");
    revalidatePath("/reports");
    revalidatePath("/activities");
    return { ok: true, data: { id: issueId } };
  } catch (error) {
    console.error("Unable to update request workflow.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update request workflow.",
    };
  }
}

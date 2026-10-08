import "server-only";

import { and, asc, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { masterDivisions, technicians, troubleshootingIssues } from "@/db/schema";
import { canAssignRequestToUnit } from "@/lib/ga-assignment";
import { canAdminReassignIssue } from "@/lib/admin-recovery";

const assignedAccounts = alias(technicians, "admin_operation_assignees");

export interface AdminOperationAgent {
  id: string;
  name: string;
  division: string;
}

export interface AdminOperationRecord {
  id: string;
  title: string;
  division: string;
  serviceDivision: string;
  status: typeof troubleshootingIssues.$inferSelect.status;
  workflowStatus: typeof troubleshootingIssues.$inferSelect.workflowStatus;
  currentAssignee: string | null;
  lastUpdatedAt: string;
  inactiveDays: number;
  stalled: boolean;
  unassigned: boolean;
  invalidAssignment: boolean;
  canReassign: boolean;
  eligibleAgents: AdminOperationAgent[];
}

export async function getAdminOperationRecords(): Promise<AdminOperationRecord[]> {
  await requireAdministrator("admin_operations.view");
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 3 * 86_400_000);

  const [rows, agents] = await Promise.all([
    db
      .select({
        id: troubleshootingIssues.id,
        title: troubleshootingIssues.title,
        division: troubleshootingIssues.division,
        serviceDivision: troubleshootingIssues.serviceDivision,
        serviceDivisionId: troubleshootingIssues.serviceDivisionId,
        receivingDivisionId: troubleshootingIssues.receivingDivisionId,
        status: troubleshootingIssues.status,
        workflowStatus: troubleshootingIssues.workflowStatus,
        workflowEnabled: troubleshootingIssues.workflowEnabled,
        assignedTechnicianId: troubleshootingIssues.assignedTechnicianId,
        assignedTechnicianName: assignedAccounts.name,
        assignedTechnicianRole: assignedAccounts.role,
        assignedTechnicianActive: assignedAccounts.isActive,
        updatedAt: troubleshootingIssues.updatedAt,
      })
      .from(troubleshootingIssues)
      .leftJoin(assignedAccounts, eq(troubleshootingIssues.assignedTechnicianId, assignedAccounts.id))
      .where(and(
        inArray(troubleshootingIssues.status, ["New", "In Progress", "Waiting for Client Approval", "Reopened"]),
        or(
          and(eq(troubleshootingIssues.workflowEnabled, true), eq(troubleshootingIssues.workflowStatus, "ready_for_assignment")),
          lt(troubleshootingIssues.updatedAt, staleBefore),
          and(
            eq(troubleshootingIssues.workflowEnabled, true),
            eq(troubleshootingIssues.workflowStatus, "assigned"),
            or(
              isNull(assignedAccounts.id),
              eq(assignedAccounts.isActive, false),
              ne(assignedAccounts.role, "service_agent"),
            ),
          ),
        ),
      ))
      .orderBy(asc(troubleshootingIssues.updatedAt), asc(troubleshootingIssues.id)),
    db
      .select({
        id: technicians.id,
        name: technicians.name,
        divisionId: masterDivisions.id,
        division: masterDivisions.name,
        isGaUnit: masterDivisions.isGaUnit,
      })
      .from(technicians)
      .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
      .where(and(eq(technicians.role, "service_agent"), eq(technicians.isActive, true)))
      .orderBy(asc(masterDivisions.name), asc(technicians.name)),
  ]);

  return rows.map((row) => {
    const stalled = row.updatedAt < staleBefore;
    const unassigned = row.workflowEnabled && row.workflowStatus === "ready_for_assignment";
    const invalidAssignment = row.workflowEnabled && row.workflowStatus === "assigned" && (
      !row.assignedTechnicianId ||
      !row.assignedTechnicianName ||
      !row.assignedTechnicianActive ||
      row.assignedTechnicianRole !== "service_agent"
    );
    const eligibleAgents = agents
      .filter((agent) => canAssignRequestToUnit(
        row.receivingDivisionId,
        row.serviceDivisionId,
        { id: agent.divisionId, isGaUnit: agent.isGaUnit },
      ))
      .filter((agent) => agent.id !== row.assignedTechnicianId)
      .map(({ id, name, division }) => ({ id, name, division }));
    return {
      id: row.id,
      title: row.title,
      division: row.division,
      serviceDivision: row.serviceDivision,
      status: row.status,
      workflowStatus: row.workflowStatus,
      currentAssignee: row.assignedTechnicianName,
      lastUpdatedAt: row.updatedAt.toISOString(),
      inactiveDays: Math.max(0, Math.floor((now.getTime() - row.updatedAt.getTime()) / 86_400_000)),
      stalled,
      unassigned,
      invalidAssignment,
      canReassign: row.workflowEnabled && canAdminReassignIssue(row.status, row.workflowStatus) && eligibleAgents.length > 0,
      eligibleAgents,
    };
  });
}

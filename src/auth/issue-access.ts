import "server-only";

import { isITDivisionName, type AuthenticatedUser } from "@/auth/session";
import type { IssueSource, RequestWorkflowStatus } from "@/data/types";

// `assigned` is passed only by the actions that let an assignee do the work. An Admin
// (Receptionist) manages a request only when a GA request was assigned to them.
export function canManageServiceIssue(
  user: AuthenticatedUser,
  serviceDivisionId: string,
  assigned?: { source: IssueSource; assignedTechnicianId: string | null },
): boolean {
  if (user.role === "administrator") return true;
  if (user.role === "receptionist") {
    return Boolean(
      assigned &&
      assigned.source === "division_request" &&
      assigned.assignedTechnicianId === user.id &&
      user.divisionId &&
      user.divisionId === serviceDivisionId,
    );
  }
  return (
    user.role === "service_agent" &&
    Boolean(user.divisionId) &&
    user.divisionId === serviceDivisionId
  );
}

export function canViewServiceIssue(
  user: AuthenticatedUser,
  issue: {
    requesterDivision: string;
    requesterId: string | null;
    serviceDivisionId: string;
    serviceDivisionName?: string | null;
    source: IssueSource;
    workflowEnabled: boolean;
    workflowStatus: RequestWorkflowStatus;
    assignedTechnicianId: string | null;
    approverId: string | null;
    finalApproverId: string | null;
  },
): boolean {
  if (user.role === "administrator") return true;
  if (issue.requesterId === user.id) return true;
  if (
    (user.role === "requester" || user.role === "service_agent") &&
    user.divisionName &&
    user.divisionName === issue.requesterDivision
  ) {
    return true;
  }
  if (user.role === "receptionist") return issue.source === "division_request";
  // First / Final Approval may view the IT team's Troubleshooting records (read-only).
  if (
    (user.role === "approver" || user.role === "final_approver") &&
    issue.source === "manual" &&
    isITDivisionName(issue.serviceDivisionName)
  ) {
    return true;
  }
  if (user.role === "final_approver") {
    return issue.workflowEnabled && (issue.workflowStatus === "waiting_final_approver" || issue.finalApproverId === user.id);
  }
  if (user.role === "approver") {
    if (issue.source !== "division_request" || !issue.workflowEnabled) return false;
    if (issue.workflowStatus === "waiting_approver") {
      return !issue.approverId || issue.approverId === user.id;
    }
    // Every First Approval can assign and follow the work once the final approver has agreed.
    if (["ready_for_assignment", "assigned", "resolved"].includes(issue.workflowStatus)) return true;
    return (
      ["waiting_final_approver", "rejected"].includes(issue.workflowStatus) &&
      issue.approverId === user.id
    );
  }
  return user.role === "service_agent" && Boolean(user.divisionId) && user.divisionId === issue.serviceDivisionId &&
    (!issue.workflowEnabled || issue.source === "manual" || (issue.workflowStatus === "assigned" && issue.assignedTechnicianId === user.id));
}

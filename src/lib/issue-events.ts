import { z } from "zod";
import type { AccountRole } from "@/data/types";

export const ISSUE_EVENT_CHANNEL = "ga_management_issue_changed";

// Routing metadata stays on the server. SSE sends only an invalidation signal.
export const issueAudienceSchema = z.object({
  division: z.string(),
  serviceDivisionId: z.string().nullable(),
  source: z.enum(["manual", "division_request"]),
  workflowEnabled: z.boolean(),
  workflowStatus: z.string(),
  approverId: z.string().nullable(),
  finalApproverId: z.string().nullable(),
  assignedTechnicianId: z.string().nullable(),
});

export type IssueAudience = z.infer<typeof issueAudienceSchema>;
type Viewer = { id: string; role: AccountRole; divisionId: string | null; divisionName: string | null };

export function canReceiveIssueChange(user: Viewer, issue: IssueAudience): boolean {
  if (user.role === "administrator") return true;
  // Requester and service roles can track requests made by their own division.
  if (
    (user.role === "requester" || user.role === "service_agent") &&
    user.divisionName &&
    user.divisionName === issue.division
  ) return true;
  if (user.role === "receptionist") return issue.source === "division_request";
  if (user.role === "approver") {
    if (issue.source !== "division_request" || !issue.workflowEnabled) return false;
    if (issue.workflowStatus === "waiting_approver") {
      return !issue.approverId || issue.approverId === user.id;
    }
    return (
      ["waiting_final_approver", "ready_for_assignment", "assigned", "resolved", "rejected"].includes(issue.workflowStatus) &&
      issue.approverId === user.id
    );
  }
  if (user.role === "final_approver") {
    return issue.source === "division_request" && issue.workflowEnabled &&
      (issue.workflowStatus === "waiting_final_approver" || issue.finalApproverId === user.id);
  }
  if (user.role === "service_agent" && user.divisionId === issue.serviceDivisionId && user.divisionId) {
    return issue.source === "manual" || !issue.workflowEnabled ||
      (issue.workflowStatus === "assigned" && issue.assignedTechnicianId === user.id);
  }
  return false;
}

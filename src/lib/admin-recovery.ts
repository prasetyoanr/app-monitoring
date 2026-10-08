import type { IssueStatus, RequestWorkflowStatus } from "@/data/types";

export function adminRecoveryReasonError(reason: string) {
  const length = reason.trim().length;
  if (length < 5) return "Provide a recovery reason of at least 5 characters.";
  if (length > 500) return "The recovery reason must not exceed 500 characters.";
  return null;
}

export function canAdminReassignIssue(
  status: IssueStatus,
  workflowStatus: RequestWorkflowStatus,
) {
  return workflowStatus === "assigned" && ["New", "In Progress", "Reopened"].includes(status);
}

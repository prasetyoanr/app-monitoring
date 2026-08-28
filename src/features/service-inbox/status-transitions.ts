import type { IssueStatus } from "@/data/types";

export type StatusTransitionRequirement =
  | "unchanged"
  | "direct"
  | "confirm"
  | "reason"
  | "invalid";

const allowedTransitions: Partial<Record<IssueStatus, readonly IssueStatus[]>> = {
  New: ["In Progress"],
  "In Progress": ["New", "Completed"],
  Completed: ["Reopened"],
  Reopened: ["In Progress"],
};

const itRequestTransitions: Partial<Record<IssueStatus, readonly IssueStatus[]>> = {
  New: ["In Progress"],
  "In Progress": ["New", "Waiting for Client Approval"],
  Completed: ["Reopened"],
  Reopened: ["In Progress"],
};

export function getBasicStatusOptions(currentStatus: IssueStatus): IssueStatus[] {
  return [currentStatus, ...(allowedTransitions[currentStatus] ?? [])];
}

export function getBasicStatusTransitionRequirement(
  previousStatus: IssueStatus,
  nextStatus: IssueStatus,
): StatusTransitionRequirement {
  if (previousStatus === nextStatus) return "unchanged";
  if (!allowedTransitions[previousStatus]?.includes(nextStatus)) return "invalid";
  if (
    (previousStatus === "In Progress" && nextStatus === "New") ||
    (previousStatus === "Completed" && nextStatus === "Reopened")
  ) {
    return "reason";
  }
  if (nextStatus === "Completed") return "confirm";
  return "direct";
}

export function getITRequestStatusOptions(currentStatus: IssueStatus): IssueStatus[] {
  return [currentStatus, ...(itRequestTransitions[currentStatus] ?? [])];
}

export function getITRequestStatusTransitionRequirement(
  previousStatus: IssueStatus,
  nextStatus: IssueStatus,
): StatusTransitionRequirement {
  if (previousStatus === nextStatus) return "unchanged";
  if (!itRequestTransitions[previousStatus]?.includes(nextStatus)) return "invalid";
  if (
    (previousStatus === "In Progress" && nextStatus === "New") ||
    (previousStatus === "Completed" && nextStatus === "Reopened")
  ) {
    return "reason";
  }
  if (nextStatus === "Waiting for Client Approval") return "confirm";
  return "direct";
}

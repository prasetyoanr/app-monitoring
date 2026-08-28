import "server-only";

import type { AuthenticatedUser } from "@/auth/session";

export function canManageServiceIssue(
  user: AuthenticatedUser,
  serviceDivisionId: string,
): boolean {
  if (user.role === "administrator") return true;
  return (
    user.role !== "requester" &&
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
  },
): boolean {
  if (user.role === "administrator") return true;
  if (issue.requesterId === user.id) return true;
  if (user.divisionName && user.divisionName === issue.requesterDivision) {
    return true;
  }
  if (user.role === "requester") return false;
  return Boolean(user.divisionId) && user.divisionId === issue.serviceDivisionId;
}

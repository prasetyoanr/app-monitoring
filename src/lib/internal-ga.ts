import { isGaDivisionSlug } from "./request-destination";

export type InternalGaStatus = "open" | "in_progress" | "done" | "cancelled";

export const INTERNAL_GA_STATUSES: readonly InternalGaStatus[] = ["open", "in_progress", "done", "cancelled"];

export const internalGaStatusLabel: Record<InternalGaStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

const IT_TEAM_SLUG = "it-team";

type InternalGaViewer = {
  role: string;
  divisionSlug?: string | null;
};

// The internal room belongs to the GA team: General Affair and, as GA staff, the IT Team.
// Other divisions, including units that merely receive GA assignments (such as Legal), are
// plain requesters. The administrator works from the inbox, not from this room.
export function isInternalGaDivisionSlug(slug: string | null | undefined): boolean {
  return isGaDivisionSlug(slug) || slug === IT_TEAM_SLUG;
}

export function canUseInternalGa(user: InternalGaViewer): boolean {
  return user.role !== "administrator" && isInternalGaDivisionSlug(user.divisionSlug);
}

type InternalGaRequestAccess = {
  createdById: string | null;
  assignedToId: string | null;
};

// A member sees the requests they wrote, the ones addressed to them and the ones addressed
// to the whole team.
export function canViewInternalGaRequest(userId: string, request: InternalGaRequestAccess): boolean {
  return request.createdById === userId || request.assignedToId === userId || request.assignedToId === null;
}

const transitions: Record<InternalGaStatus, readonly InternalGaStatus[]> = {
  open: ["in_progress", "done", "cancelled"],
  in_progress: ["open", "done", "cancelled"],
  done: ["open"],
  cancelled: ["open"],
};

// Returns an error message when the user may not move the request to `next`, otherwise null.
// The creator may cancel or reopen; whoever it is addressed to (or any member for a team-wide
// request) may work on it. Someone who is only the creator cannot mark their own request done
// when it is addressed to another person.
export function internalGaTransitionError(
  userId: string,
  request: InternalGaRequestAccess & { status: InternalGaStatus },
  next: InternalGaStatus,
): string | null {
  if (!canViewInternalGaRequest(userId, request)) return "You do not have access to this request.";
  if (!INTERNAL_GA_STATUSES.includes(next)) return "The status is invalid.";
  if (!transitions[request.status].includes(next)) {
    return `A ${internalGaStatusLabel[request.status].toLowerCase()} request cannot be changed to ${internalGaStatusLabel[next].toLowerCase()}.`;
  }
  const isCreator = request.createdById === userId;
  const isHandler = request.assignedToId === userId || request.assignedToId === null;
  if (next === "cancelled") return isCreator ? null : "Only the person who created the request can cancel it.";
  if (next === "open") return isCreator || isHandler ? null : "You cannot reopen this request.";
  return isHandler ? null : "Only the person it is addressed to can work on this request.";
}

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

export type InternalGaNotificationKind = "assigned" | "team_request" | "started" | "done" | "reopened" | "cancelled";

// Who is told about a new request: the person it is addressed to, or every other member for a
// team-wide request.
export function internalGaCreateRecipients(input: {
  creatorId: string;
  assignedToId: string | null;
  memberIds: readonly string[];
}): { kind: InternalGaNotificationKind; recipientIds: string[] } {
  if (input.assignedToId) {
    return { kind: "assigned", recipientIds: input.assignedToId === input.creatorId ? [] : [input.assignedToId] };
  }
  return { kind: "team_request", recipientIds: input.memberIds.filter((id) => id !== input.creatorId) };
}

// A status change is reported to the other side: the handler's progress goes to the creator,
// the creator's cancel or reopen goes to whoever is handling the request.
export function internalGaStatusRecipients(input: {
  actorId: string;
  createdById: string | null;
  assignedToId: string | null;
  status: InternalGaStatus;
}): { kind: InternalGaNotificationKind; recipientIds: string[] } | null {
  const kind: InternalGaNotificationKind =
    input.status === "in_progress" ? "started" : input.status === "open" ? "reopened" : input.status;
  const target = input.actorId === input.createdById ? input.assignedToId : input.createdById;
  if (!target || target === input.actorId) return null;
  return { kind, recipientIds: [target] };
}

const notificationText: Record<InternalGaNotificationKind, string> = {
  assigned: "sent you a request.",
  team_request: "sent a request to the whole GA team.",
  started: "started working on your request.",
  done: "marked your request as done.",
  reopened: "reopened the request.",
  cancelled: "cancelled the request.",
};

export function internalGaNotificationText(kind: string, actorName: string | null, note: string | null): string {
  const base = `${actorName ?? "A teammate"} ${notificationText[kind as InternalGaNotificationKind] ?? "updated the request."}`;
  return note ? `${base} ${note}` : base;
}

// New work (addressed to you or to the team) lands in the internal inbox; progress on a
// request you sent lands in your internal request history.
export function internalGaNotificationHref(kind: string): string {
  return kind === "assigned" || kind === "team_request" ? "/internal/inbox" : "/internal";
}

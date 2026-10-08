import type { AccountRole, RequestWorkflowStatus } from "@/data/types";

// Stored per recipient. The text is derived from the kind, so wording can change
// without a data migration.
export type WorkflowNotificationKind =
  | "new_request"
  | "approval_needed"
  | "final_approval_needed"
  | "ready_for_assignment"
  | "returned_for_review"
  | "revision_needed"
  | "assigned"
  | "request_assigned"
  | "request_rejected";

export type WorkflowEvent =
  | "submitted"
  | "sent_for_approval"
  | "routed_directly"
  | "approved"
  | "escalated"
  | "final_approved"
  | "returned"
  | "rejected"
  | "assigned"
  | "resolved";

export interface WorkflowNotificationInput {
  event: WorkflowEvent;
  actorId: string;
  /** Workflow status the request was in before this event. */
  previousStatus: RequestWorkflowStatus | null;
  requesterId: string | null;
  /** First approver recorded on the request before this event, if any. */
  approverId: string | null;
  /** Staff the request was just assigned to (assign / direct_assign only). */
  assigneeId: string | null;
  /** Active accounts per role. The plan decides who among them is notified. */
  pools: Partial<Record<Extract<AccountRole, "receptionist" | "approver" | "final_approver">, string[]>>;
}

export interface WorkflowNotificationTarget {
  recipientId: string;
  kind: WorkflowNotificationKind;
}

// Mirrors who can act on each stage in `canReceiveIssueChange` and
// `getNavigationCounts`, so a notification is only sent to someone who will
// actually find the request in their queue.
export function workflowNotificationPlan(input: WorkflowNotificationInput): WorkflowNotificationTarget[] {
  const { event, actorId, requesterId, approverId, assigneeId, pools } = input;
  const targets: WorkflowNotificationTarget[] = [];
  const add = (recipientId: string | null | undefined, kind: WorkflowNotificationKind) => {
    if (recipientId) targets.push({ recipientId, kind });
  };
  const addAll = (ids: string[] | undefined, kind: WorkflowNotificationKind) => {
    for (const id of ids ?? []) add(id, kind);
  };

  switch (event) {
    case "submitted":
      addAll(pools.receptionist, "new_request");
      break;
    case "sent_for_approval":
      addAll(pools.approver, "approval_needed");
      break;
    case "escalated":
      addAll(pools.final_approver, "final_approval_needed");
      break;
    case "final_approved":
      // The first approver assigns the work once the final approver agrees.
      add(approverId, "ready_for_assignment");
      break;
    case "returned":
      if (input.previousStatus === "waiting_final_approver") {
        if (approverId) add(approverId, "returned_for_review");
        else addAll(pools.approver, "returned_for_review");
      } else {
        addAll(pools.receptionist, "revision_needed");
      }
      break;
    case "rejected":
      add(requesterId, "request_rejected");
      if (input.previousStatus === "waiting_final_approver") add(approverId, "request_rejected");
      break;
    case "routed_directly":
    case "assigned":
      add(assigneeId, "assigned");
      add(requesterId, "request_assigned");
      break;
    case "approved":
    case "resolved":
      // The actor continues the work themselves, or the requester is already
      // informed through the request status notification.
      break;
  }

  const seen = new Set<string>();
  return targets.filter((target) => {
    if (target.recipientId === actorId) return false;
    // The requester never reviews their own request.
    if (requesterId && target.recipientId === requesterId && target.kind !== "request_rejected" && target.kind !== "request_assigned") return false;
    if (seen.has(target.recipientId)) return false;
    seen.add(target.recipientId);
    return true;
  });
}

const kindText: Record<WorkflowNotificationKind, string> = {
  new_request: "New request waiting for your review.",
  approval_needed: "Waiting for your approval.",
  final_approval_needed: "Waiting for your final approval.",
  ready_for_assignment: "Approved and ready for you to assign.",
  returned_for_review: "Returned to you for another review.",
  revision_needed: "Returned for revision.",
  assigned: "Assigned to you.",
  request_assigned: "Your request has been assigned to staff.",
  request_rejected: "The request was rejected.",
};

export function workflowNotificationText(kind: WorkflowNotificationKind, note: string | null): string {
  const base = kindText[kind] ?? "Request updated.";
  return note ? `${base} ${note}` : base;
}

// The Inbox has no per-ticket page, so a notification opens the queue stage that
// holds the request. Only filters the Inbox actually supports are used here.
const kindHref: Record<WorkflowNotificationKind, string> = {
  new_request: "/inbox?workflow=intake",
  approval_needed: "/inbox?workflow=waiting_approver",
  final_approval_needed: "/inbox?workflow=waiting_final_approver",
  ready_for_assignment: "/inbox?workflow=ready_for_assignment",
  returned_for_review: "/inbox?workflow=waiting_approver",
  revision_needed: "/inbox?workflow=intake",
  assigned: "/inbox",
  request_assigned: "/requests",
  request_rejected: "/requests",
};

export function workflowNotificationHref(kind: WorkflowNotificationKind): string {
  return kindHref[kind] ?? "/inbox";
}

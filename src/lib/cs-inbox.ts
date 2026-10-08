import type { RequestWorkflowStatus } from "@/data/types";

export type CsInboxTab = "intake" | "approval" | "processed";

export const CS_INBOX_TABS: ReadonlyArray<{ value: CsInboxTab; label: string }> = [
  { value: "intake", label: "New" },
  { value: "approval", label: "Approvals" },
  { value: "processed", label: "Completed" },
];

export function requestBelongsToCsInboxTab(status: RequestWorkflowStatus, tab: CsInboxTab) {
  if (tab === "intake") return status === "submitted" || status === "needs_revision";
  if (tab === "approval") {
    return status === "waiting_approver" || status === "waiting_final_approver" || status === "ready_for_assignment";
  }
  return status === "assigned" || status === "rejected" || status === "resolved";
}

export function csInboxEmptyMessage(tab: CsInboxTab) {
  if (tab === "intake") return "No new requests need Admin review.";
  if (tab === "approval") return "No requests are currently in the approval process.";
  return "No routed or closed requests are available.";
}

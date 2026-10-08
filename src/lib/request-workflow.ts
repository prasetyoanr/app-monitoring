import type { AccountRole, RequestWorkflowCommand, RequestWorkflowStatus, TicketRecord } from "@/data/types";
import { issueStatusLabel } from "./issue-status";

export function ticketStatusLabel(ticket: Pick<TicketRecord, "status" | "workflowEnabled" | "workflowStatus">) {
  return ticket.workflowEnabled && ticket.workflowStatus !== "assigned"
    ? requestWorkflowLabel(ticket.workflowStatus)
    : issueStatusLabel(ticket.status);
}

export function workflowNoteError(command: RequestWorkflowCommand, note: string): string | null {
  const length = note.trim().length;
  if (command === "resolve" && length < 5) return "Describe the administrative resolution in at least 5 characters.";
  if (length > 1_000) return "The note must not exceed 1000 characters.";
  if (command === "direct_assign" && length < 5) {
    return "Direct assignment requires a reason of at least 5 characters explaining why First Approval is not needed.";
  }
  if ((command === "return" || command === "reject") && length < 5) {
    return "Return and rejection actions require a note of at least 5 characters.";
  }
  return null;
}

export function workflowCommands(role: AccountRole, status: RequestWorkflowStatus, approvalRequired: boolean | null): RequestWorkflowCommand[] {
  const administrator = role === "administrator";
  if ((administrator || role === "receptionist") && (status === "submitted" || status === "needs_revision")) {
    return approvalRequired ? ["send_for_approval"] : ["send_for_approval", "direct_assign", "resolve"];
  }
  if ((administrator || role === "approver") && status === "waiting_approver") {
    return ["approve", "escalate", "return", "reject"];
  }
  if ((administrator || role === "final_approver") && status === "waiting_final_approver") {
    return ["approve", "return", "reject"];
  }
  if ((administrator || role === "approver") && status === "ready_for_assignment") return ["assign", "resolve"];
  return [];
}

export function workflowTransition(
  role: AccountRole,
  current: RequestWorkflowStatus,
  approvalRequired: boolean | null,
  command: RequestWorkflowCommand,
): { status: RequestWorkflowStatus; action: "sent_for_approval" | "routed_directly" | "approved" | "escalated" | "final_approved" | "returned" | "rejected" | "assigned" | "resolved" } | null {
  if (!workflowCommands(role, current, approvalRequired).includes(command)) return null;
  switch (command) {
    case "resolve": return { status: "resolved", action: "resolved" };
    case "send_for_approval": return { status: "waiting_approver", action: "sent_for_approval" };
    case "direct_assign": return { status: "assigned", action: "routed_directly" };
    case "approve": return { status: "ready_for_assignment", action: current === "waiting_final_approver" ? "final_approved" : "approved" };
    case "escalate": return { status: "waiting_final_approver", action: "escalated" };
    case "return": return { status: current === "waiting_final_approver" ? "waiting_approver" : "needs_revision", action: "returned" };
    case "reject": return { status: "rejected", action: "rejected" };
    case "assign": return { status: "assigned", action: "assigned" };
  }
}

export function requestWorkflowLabel(status: RequestWorkflowStatus) {
  const labels: Record<RequestWorkflowStatus, string> = {
    resolved: "Resolved administratively",
    submitted: "Submitted to Admin",
    waiting_approver: "Awaiting First Approval",
    waiting_final_approver: "Awaiting Final Approval",
    ready_for_assignment: "Approved · Awaiting assignment",
    assigned: "Assigned to staff",
    needs_revision: "Needs revision",
    rejected: "Rejected",
  };
  return labels[status];
}

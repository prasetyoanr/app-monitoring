import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRole, RequestWorkflowCommand, RequestWorkflowStatus } from "@/data/types";
import { ticketStatusLabel, workflowCommands, workflowNoteError, workflowTransition } from "./request-workflow";

const statuses: RequestWorkflowStatus[] = ["submitted", "waiting_approver", "waiting_final_approver", "ready_for_assignment", "assigned", "needs_revision", "rejected", "resolved"];
const commands: RequestWorkflowCommand[] = ["send_for_approval", "direct_assign", "approve", "escalate", "return", "reject", "assign", "resolve"];

test("all request views distinguish approval progress from operational status", () => {
  const ticket = { status: "New" as const, workflowEnabled: true, workflowStatus: "waiting_approver" as const };
  assert.equal(ticketStatusLabel(ticket), "Awaiting GA Supervisor approval");
  assert.equal(ticketStatusLabel({ ...ticket, workflowStatus: "ready_for_assignment" }), "Approved · Awaiting assignment");
  assert.equal(ticketStatusLabel({ ...ticket, workflowStatus: "assigned" }), "New");
  assert.equal(ticketStatusLabel({ ...ticket, workflowEnabled: false }), "New");
  assert.equal(ticketStatusLabel({ ...ticket, workflowStatus: "assigned", status: "Completed" }), "Completed");
});

test("direct assignment requires a meaningful-length reason after trimming", () => {
  for (const note of ["", "     ", "abcd", "  abcd  "]) {
    assert.match(workflowNoteError("direct_assign", note) ?? "", /Direct assignment requires a reason/);
  }
  for (const note of ["abcde", "  abcde  ", "Routine service; no supervisor approval needed.", "a".repeat(1000)]) {
    assert.equal(workflowNoteError("direct_assign", note), null);
  }
});

test("return and rejection still require notes while other decisions allow empty notes", () => {
  for (const command of commands) {
    if (command === "direct_assign" || command === "resolve") continue;
    if (command === "return" || command === "reject") {
      assert.match(workflowNoteError(command, " abcd ") ?? "", /require a note of at least 5 characters/);
      assert.equal(workflowNoteError(command, "abcde"), null);
    } else {
      assert.equal(workflowNoteError(command, ""), null);
      assert.equal(workflowNoteError(command, "   "), null);
    }
  }
});

test("all workflow notes enforce the same upper length limit", () => {
  for (const command of commands) {
    assert.equal(workflowNoteError(command, "a".repeat(1000)), null);
    assert.equal(workflowNoteError(command, "a".repeat(1001)), "The note must not exceed 1000 characters.");
  }
});

test("requester and service agent cannot make organizational decisions", () => {
  for (const role of ["requester", "service_agent"] as AccountRole[]) {
    for (const status of statuses) {
      for (const command of commands) assert.equal(workflowTransition(role, status, true, command), null);
    }
  }
});

test("administrator can perform every role-specific workflow decision", () => {
  assert.deepEqual(workflowCommands("administrator", "submitted", false), ["send_for_approval", "direct_assign", "resolve"]);
  assert.deepEqual(workflowCommands("administrator", "waiting_approver", true), ["approve", "escalate", "return", "reject"]);
  assert.deepEqual(workflowCommands("administrator", "waiting_final_approver", true), ["approve", "return", "reject"]);
  assert.deepEqual(workflowCommands("administrator", "ready_for_assignment", true), ["assign", "resolve"]);
});

test("reception can assign directly only before approval is required", () => {
  assert.equal(workflowTransition("receptionist", "submitted", null, "direct_assign")?.status, "assigned");
  assert.equal(workflowTransition("receptionist", "needs_revision", true, "direct_assign"), null);
  assert.equal(workflowTransition("receptionist", "waiting_approver", true, "approve"), null);
});

test("approver cannot bypass final approval and final approver cannot bypass escalation", () => {
  for (const command of commands) {
    assert.equal(workflowTransition("approver", "waiting_final_approver", true, command), null);
    assert.equal(workflowTransition("final_approver", "waiting_approver", true, command), null);
  }
  assert.equal(workflowTransition("final_approver", "ready_for_assignment", true, "assign"), null);
});

test("approval chain returns to first approver for assignment", () => {
  assert.equal(workflowTransition("receptionist", "submitted", null, "send_for_approval")?.status, "waiting_approver");
  assert.equal(workflowTransition("approver", "waiting_approver", true, "escalate")?.status, "waiting_final_approver");
  assert.deepEqual(workflowTransition("final_approver", "waiting_final_approver", true, "approve"), { status: "ready_for_assignment", action: "final_approved" });
  assert.equal(workflowTransition("approver", "ready_for_assignment", true, "assign")?.status, "assigned");
});

test("returns go to the previous reviewer and rejection is terminal", () => {
  assert.equal(workflowTransition("final_approver", "waiting_final_approver", true, "return")?.status, "waiting_approver");
  assert.equal(workflowTransition("approver", "waiting_approver", true, "return")?.status, "needs_revision");
  assert.equal(workflowTransition("final_approver", "waiting_final_approver", true, "reject")?.status, "rejected");
  for (const role of ["administrator", "receptionist", "approver", "final_approver"] as AccountRole[]) {
    assert.deepEqual(workflowCommands(role, "rejected", true), []);
    assert.deepEqual(workflowCommands(role, "assigned", true), []);
  }
});

test("UI command options and server transitions agree for every role and state", () => {
  for (const role of ["administrator", "receptionist", "approver", "final_approver", "service_agent", "requester"] as AccountRole[]) {
    for (const status of statuses) {
      for (const approvalRequired of [true, false, null]) {
        for (const command of commands) {
          assert.equal(Boolean(workflowTransition(role, status, approvalRequired, command)), workflowCommands(role, status, approvalRequired).includes(command));
        }
      }
    }
  }
});

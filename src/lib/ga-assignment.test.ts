import assert from "node:assert/strict";
import test from "node:test";
import { canAssignRequestToUnit } from "./ga-assignment";
import { workflowCommands, workflowNoteError, workflowTransition } from "./request-workflow";
import { requestHistoryGroup } from "./request-history";
import { requestBelongsToCsInboxTab } from "./cs-inbox";

test("GA can assign IT without moving IT accounts; non-GA units are rejected", () => {
  assert.equal(canAssignRequestToUnit("ga", "ga", { id: "it", isGaUnit: true }), true);
  assert.equal(canAssignRequestToUnit("ga", "ga", { id: "finance", isGaUnit: false }), false);
  assert.equal(canAssignRequestToUnit(null, "it", { id: "ga", isGaUnit: true }), false);
  assert.equal(canAssignRequestToUnit(null, "it", { id: "it", isGaUnit: false }), true);
});
test("administrative resolution requires a note and cannot bypass approval", () => {
  assert.ok(workflowNoteError("resolve", ""));
  assert.equal(workflowNoteError("resolve", "Dokumen sudah dikirim."), null);
  assert.equal(workflowTransition("receptionist", "submitted", null, "resolve")?.status, "resolved");
  for (const state of ["waiting_approver", "waiting_final_approver", "ready_for_assignment"] as const) {
    assert.equal(workflowTransition("receptionist", state, true, "resolve"), null);
  }
  assert.equal(workflowTransition("receptionist", "needs_revision", true, "resolve"), null);
  assert.equal(workflowTransition("final_approver", "waiting_final_approver", true, "resolve"), null);
  assert.equal(workflowTransition("approver", "ready_for_assignment", true, "resolve")?.status, "resolved");
  assert.deepEqual(workflowCommands("receptionist", "resolved", false), []);
  assert.equal(requestHistoryGroup({ workflowEnabled: true, workflowStatus: "resolved", status: "Completed" }), "completed");
  assert.equal(requestBelongsToCsInboxTab("resolved", "processed"), true);
});

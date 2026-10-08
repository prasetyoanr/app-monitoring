import assert from "node:assert/strict";
import test from "node:test";

import { adminRecoveryReasonError, canAdminReassignIssue } from "./admin-recovery";

test("administrator recovery requires a meaningful bounded reason", () => {
  assert.match(adminRecoveryReasonError("no") ?? "", /at least 5/);
  assert.equal(adminRecoveryReasonError("Assignment moved because the previous member is unavailable."), null);
  assert.match(adminRecoveryReasonError("x".repeat(501)) ?? "", /must not exceed 500/);
});

test("reassignment preserves approval and only recovers active assigned work", () => {
  assert.equal(canAdminReassignIssue("In Progress", "assigned"), true);
  assert.equal(canAdminReassignIssue("Reopened", "assigned"), true);
  assert.equal(canAdminReassignIssue("Completed", "assigned"), false);
  assert.equal(canAdminReassignIssue("New", "ready_for_assignment"), false);
  assert.equal(canAdminReassignIssue("Waiting for Client Approval", "assigned"), false);
});

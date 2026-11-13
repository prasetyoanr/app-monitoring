import assert from "node:assert/strict";
import test from "node:test";

import {
  canEditScorecard,
  canReviewScorecard,
  requiredApproverRole,
  submitScorecard,
} from "./kpi-approval";

test("required approver follows the chain staff -> first -> final", () => {
  assert.equal(requiredApproverRole("service_agent"), "approver");
  assert.equal(requiredApproverRole("receptionist"), "approver");
  assert.equal(requiredApproverRole("approver"), "final_approver");
  assert.equal(requiredApproverRole("final_approver"), null);
});

test("any approver with the right role can review, regardless of division", () => {
  const staff = { id: "s1", role: "service_agent" as const };
  assert.equal(canReviewScorecard({ id: "a1", role: "approver" }, staff), true);
  assert.equal(canReviewScorecard({ id: "a2", role: "approver" }, staff), true);
  assert.equal(canReviewScorecard({ id: "s1", role: "service_agent" }, staff), false);
  assert.equal(canReviewScorecard({ id: "f1", role: "final_approver" }, staff), false);
  assert.equal(canReviewScorecard({ id: "administrator", role: "administrator" }, staff), false);
});

test("first approval cannot approve their own KPI, final approval can", () => {
  const first = { id: "a1", role: "approver" as const };
  assert.equal(canReviewScorecard({ id: "a1", role: "approver" }, first), false);
  assert.equal(canReviewScorecard({ id: "f1", role: "final_approver" }, first), true);
  const final = { id: "f1", role: "final_approver" as const };
  assert.equal(canReviewScorecard({ id: "f1", role: "final_approver" }, final), false);
  assert.equal(canReviewScorecard({ id: "f2", role: "final_approver" }, final), false);
});

test("scorecards lock while waiting or after approval, except for final approval", () => {
  assert.equal(canEditScorecard("service_agent", "draft"), true);
  assert.equal(canEditScorecard("service_agent", "rejected"), true);
  assert.equal(canEditScorecard("service_agent", "submitted"), false);
  assert.equal(canEditScorecard("approver", "approved"), false);
  assert.equal(canEditScorecard("final_approver", "approved"), true);
});

test("submit validates weight and auto-approves for final approval", () => {
  assert.deepEqual(submitScorecard("service_agent", 3, 100), { ok: true, status: "submitted" });
  assert.deepEqual(submitScorecard("final_approver", 3, 100), { ok: true, status: "approved" });
  assert.equal(submitScorecard("service_agent", 0, 0).ok, false);
  assert.equal(submitScorecard("service_agent", 2, 90).ok, false);
});

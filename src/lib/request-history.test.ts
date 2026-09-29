import assert from "node:assert/strict";
import test from "node:test";
import { requestHistoryGroup } from "./request-history";

test("legacy completed requests ignore unused workflow status", () => {
  assert.equal(requestHistoryGroup({ status: "Completed", workflowEnabled: false, workflowStatus: "submitted" }), "completed");
});

test("organizational decisions take precedence over operational completion", () => {
  assert.equal(requestHistoryGroup({ status: "Completed", workflowEnabled: true, workflowStatus: "rejected" }), "rejected");
  assert.equal(requestHistoryGroup({ status: "Completed", workflowEnabled: true, workflowStatus: "waiting_approver" }), "active");
});

test("assigned completed work is completed; reopened work is active", () => {
  assert.equal(requestHistoryGroup({ status: "Completed", workflowEnabled: true, workflowStatus: "assigned" }), "completed");
  assert.equal(requestHistoryGroup({ status: "Reopened", workflowEnabled: true, workflowStatus: "assigned" }), "active");
});

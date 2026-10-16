import assert from "node:assert/strict";
import test from "node:test";
import { laneAllowsAssignee, laneAllowsViewer } from "./service-lane";

test("a lane account sees only its own lane while an unscoped account sees all", () => {
  assert.equal(laneAllowsViewer(null, "asset"), true);
  assert.equal(laneAllowsViewer(null, null), true);
  assert.equal(laneAllowsViewer("asset", "asset"), true);
  assert.equal(laneAllowsViewer("asset", "atk_rtk"), false);
  assert.equal(laneAllowsViewer("asset", null), false);
  assert.equal(laneAllowsViewer("atk_rtk", "asset"), false);
});

test("asset requests are assignable to Asset staff only", () => {
  assert.equal(laneAllowsAssignee("asset", "asset"), true);
  assert.equal(laneAllowsAssignee("asset", null), false);
  assert.equal(laneAllowsAssignee("asset", "atk_rtk"), false);
});

test("other requests are never assigned to staff tied to a different lane", () => {
  assert.equal(laneAllowsAssignee("atk_rtk", null), true);
  assert.equal(laneAllowsAssignee("atk_rtk", "atk_rtk"), true);
  assert.equal(laneAllowsAssignee("atk_rtk", "asset"), false);
  assert.equal(laneAllowsAssignee(null, "asset"), false);
  assert.equal(laneAllowsAssignee(null, null), true);
});

test("realtime changes reach a lane Admin only for requests of that lane", async () => {
  const { canReceiveIssueChange } = await import("./issue-events");
  const audience = {
    division: "Finance", serviceDivisionId: "d", source: "division_request" as const, workflowEnabled: true,
    workflowStatus: "submitted", approverId: null, finalApproverId: null, assignedTechnicianId: null,
  };
  const admin = (serviceLane: "asset" | "atk_rtk" | null) => ({ id: "u", role: "receptionist" as const, serviceLane, divisionId: null, divisionName: null });
  assert.equal(canReceiveIssueChange(admin("asset"), { ...audience, serviceLane: "asset" }), true);
  assert.equal(canReceiveIssueChange(admin("asset"), { ...audience, serviceLane: "atk_rtk" }), false);
  assert.equal(canReceiveIssueChange(admin("asset"), audience), false);
  assert.equal(canReceiveIssueChange(admin(null), { ...audience, serviceLane: "asset" }), true);
});

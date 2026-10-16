import assert from "node:assert/strict";
import test from "node:test";
import { laneAllowsAssignee, laneAllowsActor } from "./service-lane";

test("only Asset-lane accounts act on Asset requests; general requests are open to everyone", () => {
  assert.equal(laneAllowsActor("asset", "asset"), true);
  assert.equal(laneAllowsActor(null, "asset"), false);
  assert.equal(laneAllowsActor(undefined, "asset"), false);
  assert.equal(laneAllowsActor("asset", null), true);
  assert.equal(laneAllowsActor(null, null), true);
  assert.equal(laneAllowsActor(null, undefined), true);
});

test("asset requests are assignable to Asset accounts only", () => {
  assert.equal(laneAllowsAssignee("asset", { role: "service_agent", serviceLane: "asset" }), true);
  assert.equal(laneAllowsAssignee("asset", { role: "receptionist", serviceLane: "asset" }), true);
  assert.equal(laneAllowsAssignee("asset", { role: "receptionist", serviceLane: null }), false);
  assert.equal(laneAllowsAssignee("asset", { role: "service_agent", serviceLane: null }), false);
});

test("general requests are never assigned to Asset staff, but Asset Admins can take them", () => {
  assert.equal(laneAllowsAssignee(null, { role: "service_agent", serviceLane: "asset" }), false);
  assert.equal(laneAllowsAssignee(null, { role: "service_agent", serviceLane: null }), true);
  assert.equal(laneAllowsAssignee(null, { role: "receptionist", serviceLane: "asset" }), true);
  assert.equal(laneAllowsAssignee(null, { role: "receptionist", serviceLane: null }), true);
});

test("every Admin follows realtime changes of Asset requests as read-only history", async () => {
  const { canReceiveIssueChange } = await import("./issue-events");
  const audience = {
    division: "Finance", serviceDivisionId: "d", source: "division_request" as const, workflowEnabled: true,
    workflowStatus: "submitted", approverId: null, finalApproverId: null, assignedTechnicianId: null,
  };
  const admin = (serviceLane: "asset" | null) => ({ id: "u", role: "receptionist" as const, serviceLane, divisionId: null, divisionName: null });
  assert.equal(canReceiveIssueChange(admin("asset"), { ...audience, serviceLane: "asset" }), true);
  assert.equal(canReceiveIssueChange(admin(null), { ...audience, serviceLane: "asset" }), true);
  assert.equal(canReceiveIssueChange(admin(null), audience), true);
});

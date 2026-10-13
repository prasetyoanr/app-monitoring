import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseInternalGa,
  canViewInternalGaRequest,
  internalGaTransitionError,
} from "./internal-ga";

test("GA and IT Team staff use the internal room, everyone else does not", () => {
  assert.equal(canUseInternalGa({ role: "receptionist", divisionSlug: "general-affair" }), true);
  assert.equal(canUseInternalGa({ role: "requester", divisionSlug: "ga" }), true);
  assert.equal(canUseInternalGa({ role: "service_agent", divisionSlug: "it-team" }), true);
  assert.equal(canUseInternalGa({ role: "requester", divisionSlug: "legal" }), false);
  assert.equal(canUseInternalGa({ role: "requester", divisionSlug: "purchase" }), false);
  assert.equal(canUseInternalGa({ role: "requester", divisionSlug: null }), false);
  assert.equal(canUseInternalGa({ role: "administrator", divisionSlug: "general-affair" }), false);
});

test("a member sees own, addressed and team-wide requests only", () => {
  assert.equal(canViewInternalGaRequest("a", { createdById: "a", assignedToId: "b" }), true);
  assert.equal(canViewInternalGaRequest("b", { createdById: "a", assignedToId: "b" }), true);
  assert.equal(canViewInternalGaRequest("c", { createdById: "a", assignedToId: null }), true);
  assert.equal(canViewInternalGaRequest("c", { createdById: "a", assignedToId: "b" }), false);
});

test("the assignee works the request and the creator can cancel it", () => {
  const request = { createdById: "a", assignedToId: "b", status: "open" as const };
  assert.equal(internalGaTransitionError("b", request, "in_progress"), null);
  assert.equal(internalGaTransitionError("b", request, "done"), null);
  assert.equal(internalGaTransitionError("a", request, "cancelled"), null);
  assert.match(internalGaTransitionError("a", request, "done")!, /addressed to/);
  assert.match(internalGaTransitionError("b", request, "cancelled")!, /created/);
  assert.match(internalGaTransitionError("c", request, "done")!, /access/);
});

test("a team-wide request can be picked up by any member", () => {
  const request = { createdById: "a", assignedToId: null, status: "open" as const };
  assert.equal(internalGaTransitionError("c", request, "in_progress"), null);
  assert.equal(internalGaTransitionError("a", request, "done"), null);
});

test("finished requests can only be reopened", () => {
  const done = { createdById: "a", assignedToId: "b", status: "done" as const };
  assert.equal(internalGaTransitionError("a", done, "open"), null);
  assert.match(internalGaTransitionError("b", done, "in_progress")!, /cannot be changed/);
});

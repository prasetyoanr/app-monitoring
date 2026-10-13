import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseInternalGa,
  canViewInternalGaRequest,
  internalGaCreateRecipients,
  internalGaEventText,
  internalGaMoveAllowed,
  internalGaNotificationHref,
  internalGaNotificationText,
  internalGaStatusRecipients,
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

test("a new request notifies the recipient, or the whole team except the creator", () => {
  assert.deepEqual(
    internalGaCreateRecipients({ creatorId: "a", assignedToId: "b", memberIds: ["a", "b", "c"] }),
    { kind: "assigned", recipientIds: ["b"] },
  );
  assert.deepEqual(
    internalGaCreateRecipients({ creatorId: "a", assignedToId: null, memberIds: ["a", "b", "c"] }),
    { kind: "team_request", recipientIds: ["b", "c"] },
  );
});

test("a status change notifies the other side only", () => {
  assert.deepEqual(
    internalGaStatusRecipients({ actorId: "b", createdById: "a", assignedToId: "b", status: "done" }),
    { kind: "done", recipientIds: ["a"] },
  );
  assert.deepEqual(
    internalGaStatusRecipients({ actorId: "a", createdById: "a", assignedToId: "b", status: "cancelled" }),
    { kind: "cancelled", recipientIds: ["b"] },
  );
  assert.equal(internalGaStatusRecipients({ actorId: "a", createdById: "a", assignedToId: null, status: "cancelled" }), null);
  assert.equal(internalGaStatusRecipients({ actorId: "a", createdById: "a", assignedToId: "a", status: "open" }), null);
});

test("notification text names who acted", () => {
  assert.equal(internalGaNotificationText("assigned", "Wasik", null), "Wasik sent you a request.");
  assert.match(internalGaNotificationText("done", null, "Fixed"), /^A teammate marked your request as done\. Fixed$/);
});

test("notifications open the page where the person acts on them", () => {
  assert.equal(internalGaNotificationHref("assigned"), "/internal/inbox");
  assert.equal(internalGaNotificationHref("team_request"), "/internal/inbox");
  assert.equal(internalGaNotificationHref("done"), "/internal");
  assert.equal(internalGaNotificationHref("cancelled"), "/internal");
});

test("the status machine is separate from who is asking", () => {
  assert.equal(internalGaMoveAllowed("open", "done"), true);
  assert.equal(internalGaMoveAllowed("done", "in_progress"), false);
});

test("timeline lines name who did what", () => {
  const base = { actorName: "Wasik", previousStatus: null, status: null, subjectName: null };
  assert.equal(internalGaEventText({ ...base, kind: "created", subjectName: "Budi" }), "Wasik created the request for Budi.");
  assert.equal(internalGaEventText({ ...base, kind: "created" }), "Wasik created the request for the whole team.");
  assert.equal(internalGaEventText({ ...base, kind: "assigned" }), "Wasik took the request.");
  assert.equal(
    internalGaEventText({ ...base, kind: "status_changed", previousStatus: "open", status: "done" }),
    "Wasik changed the status from Open to Done.",
  );
});

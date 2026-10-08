import assert from "node:assert/strict";
import test from "node:test";

import { workflowNotificationHref, workflowNotificationPlan, type WorkflowNotificationInput, type WorkflowNotificationKind } from "./workflow-notifications";

const kindTextProbe: Record<WorkflowNotificationKind, true> = {
  new_request: true, approval_needed: true, final_approval_needed: true, ready_for_assignment: true,
  returned_for_review: true, revision_needed: true, assigned: true, request_assigned: true, request_rejected: true,
};

const base: WorkflowNotificationInput = {
  event: "submitted",
  actorId: "actor",
  previousStatus: null,
  requesterId: "requester",
  approverId: null,
  assigneeId: null,
  pools: { receptionist: ["rec-1", "rec-2"], approver: ["app-1", "app-2"], final_approver: ["fin-1"] },
};

const plan = (overrides: Partial<WorkflowNotificationInput>) => workflowNotificationPlan({ ...base, ...overrides });

test("a new request notifies only the receptionist pool", () => {
  assert.deepEqual(plan({}), [
    { recipientId: "rec-1", kind: "new_request" },
    { recipientId: "rec-2", kind: "new_request" },
  ]);
});

test("sending for approval notifies approvers, never the actor or requester", () => {
  const result = plan({
    event: "sent_for_approval",
    actorId: "app-1",
    requesterId: "app-2",
  });
  assert.deepEqual(result, []);
  assert.deepEqual(
    plan({ event: "sent_for_approval", actorId: "rec-1" }).map((item) => item.recipientId),
    ["app-1", "app-2"],
  );
});

test("escalation notifies final approvers only", () => {
  assert.deepEqual(plan({ event: "escalated", actorId: "app-1" }), [
    { recipientId: "fin-1", kind: "final_approval_needed" },
  ]);
});

test("final approval hands the request back to the first approver", () => {
  assert.deepEqual(plan({ event: "final_approved", actorId: "fin-1", approverId: "app-1" }), [
    { recipientId: "app-1", kind: "ready_for_assignment" },
  ]);
  assert.deepEqual(plan({ event: "final_approved", actorId: "fin-1", approverId: null }), []);
});

test("a return from final approval goes to the first approver; otherwise to reception", () => {
  assert.deepEqual(
    plan({ event: "returned", actorId: "fin-1", previousStatus: "waiting_final_approver", approverId: "app-2" }),
    [{ recipientId: "app-2", kind: "returned_for_review" }],
  );
  assert.deepEqual(
    plan({ event: "returned", actorId: "app-1", previousStatus: "waiting_approver" }).map((item) => item.kind),
    ["revision_needed", "revision_needed"],
  );
});

test("rejection informs the requester and, after final review, the first approver", () => {
  assert.deepEqual(plan({ event: "rejected", actorId: "app-1", previousStatus: "waiting_approver" }), [
    { recipientId: "requester", kind: "request_rejected" },
  ]);
  assert.deepEqual(
    plan({ event: "rejected", actorId: "fin-1", previousStatus: "waiting_final_approver", approverId: "app-1" }).map((item) => item.recipientId),
    ["requester", "app-1"],
  );
});

test("assignment notifies the assignee and the requester, but not the assigner", () => {
  assert.deepEqual(plan({ event: "assigned", actorId: "app-1", assigneeId: "agent" }), [
    { recipientId: "agent", kind: "assigned" },
    { recipientId: "requester", kind: "request_assigned" },
  ]);
  assert.deepEqual(plan({ event: "assigned", actorId: "agent", assigneeId: "agent" }).map((item) => item.recipientId), ["requester"]);
});

test("approval by the same approver and administrative resolution create no notification", () => {
  assert.deepEqual(plan({ event: "approved", actorId: "app-1" }), []);
  assert.deepEqual(plan({ event: "resolved", actorId: "rec-1" }), []);
});

test("recipients are never duplicated", () => {
  const result = plan({ event: "sent_for_approval", actorId: "rec-1", pools: { approver: ["app-1", "app-1"] } });
  assert.equal(result.length, 1);
});

test("notification links only point to pages that exist", () => {
  const allowed = new Set(["/inbox", "/requests", "/inbox?workflow=intake", "/inbox?workflow=waiting_approver", "/inbox?workflow=waiting_final_approver", "/inbox?workflow=ready_for_assignment"]);
  for (const kind of Object.keys(kindTextProbe) as WorkflowNotificationKind[]) {
    assert.ok(allowed.has(workflowNotificationHref(kind)), `${kind} -> ${workflowNotificationHref(kind)}`);
  }
});

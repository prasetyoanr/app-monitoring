import assert from "node:assert/strict";
import test from "node:test";

import type { RequestWorkflowStatus } from "@/data/types";
import {
  CS_INBOX_TABS,
  csInboxEmptyMessage,
  requestBelongsToCsInboxTab,
} from "./cs-inbox";

const statuses: RequestWorkflowStatus[] = [
  "submitted",
  "needs_revision",
  "waiting_approver",
  "waiting_final_approver",
  "ready_for_assignment",
  "assigned",
  "rejected",
];

test("every workflow status belongs to exactly one CS inbox tab", () => {
  for (const status of statuses) {
    const matches = CS_INBOX_TABS.filter((tab) => requestBelongsToCsInboxTab(status, tab.value));
    assert.equal(matches.length, 1, `${status} should belong to one tab`);
  }
});

test("CS inbox tabs separate intake, approval, and processed requests", () => {
  assert.equal(requestBelongsToCsInboxTab("submitted", "intake"), true);
  assert.equal(requestBelongsToCsInboxTab("waiting_final_approver", "approval"), true);
  assert.equal(requestBelongsToCsInboxTab("assigned", "processed"), true);
  assert.equal(requestBelongsToCsInboxTab("rejected", "processed"), true);
  assert.match(csInboxEmptyMessage("approval"), /approval/i);
});

import assert from "node:assert/strict";
import test from "node:test";

import { auditActionLabel, auditDetailsText, auditModuleName } from "./audit-log-readable";

test("actions read as a subject and a verb", () => {
  assert.equal(auditActionLabel("ga.spreadsheet.permission_updated"), "Spreadsheet · Permission updated");
  assert.equal(auditActionLabel("authentication.login_failed"), "Authentication · Login failed");
  assert.equal(auditActionLabel("ga_internal_request.status_changed"), "Ga internal request · Status changed");
  assert.equal(auditActionLabel("submitted"), "Submitted");
});

test("actions are grouped into the same modules as the log filter", () => {
  assert.equal(auditModuleName("ga_internal_request.created"), "Internal GA");
  assert.equal(auditModuleName("ga.spreadsheet.opened"), "GA activities");
  assert.equal(auditModuleName("authorization.denied"), "Security");
  assert.equal(auditModuleName("master_division.request_settings_updated"), "Master data");
  assert.equal(auditModuleName("something.else"), "Other");
});

test("details become one readable line per value and stay redacted", () => {
  const text = auditDetailsText({
    previousStatus: "open",
    status: "done",
    hasNote: true,
    assignedToId: null,
    nested: { memberName: "Wasik", tokenHash: "must-not-leak" },
  });
  assert.equal(
    text,
    [
      "Previous status: open",
      "Status: done",
      "Has note: Yes",
      "Nested member name: Wasik",
      "Nested token hash: [REDACTED]",
    ].join("\n"),
  );
  assert.doesNotMatch(text, /must-not-leak/);
  assert.equal(auditDetailsText(null), "");
  assert.equal(auditDetailsText({ filters: { module: null, query: "" } }), "");
});

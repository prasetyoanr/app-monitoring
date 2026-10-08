import assert from "node:assert/strict";
import test from "node:test";

import { auditActionStyle, auditActionTone } from "./audit-action-style";

test("every action name seen in the application gets a sensible colour", () => {
  const expected: Record<string, string> = {
    "authentication.login": "create",
    "authentication.login_failed": "alert",
    "authentication.logout": "session",
    "authorization.denied": "alert",
    "sensitive_data.accessed": "sensitive",
    "account.created": "create",
    "account.updated": "update",
    "account.password_reset": "sensitive",
    "account.deleted": "delete",
    "issue.created": "create",
    "issue.updated": "update",
    "issue.deleted": "delete",
    "approval.requested": "approval",
    "approval.approved": "create",
    "survey.published": "create",
    "survey.closed": "session",
    "survey.duplicated": "update",
    "survey.ai_analysis_queued": "create",
    "master_location.deleted": "delete",
    "master_division.request_settings_updated": "update",
    "report.exported": "approval",
  };
  for (const [action, tone] of Object.entries(expected)) {
    assert.equal(auditActionTone(action), tone, action);
  }
});

test("a failed sign-in is an alert, not a sign-in", () => {
  assert.equal(auditActionTone("authentication.login_failed"), "alert");
});

test("unknown actions fall back to the neutral style", () => {
  assert.equal(auditActionStyle("something.new").tone, "session");
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildAuditLogCsv, csvCell } from "./audit-log-export";

test("csvCell escapes quotes and spreadsheet formulas", () => {
  assert.equal(csvCell('A "quoted" value'), '"A ""quoted"" value"');
  assert.equal(csvCell(" =HYPERLINK('https://example.com')"), '"\' =HYPERLINK(\'https://example.com\')"');
});

test("audit log CSV redacts sensitive metadata", () => {
  const csv = buildAuditLogCsv([{
    id: "log-1",
    actorType: "technician",
    actorId: "user-1",
    actorName: "Administrator",
    actorUsername: "admin",
    action: "audit_log.exported",
    entityType: "audit_log",
    entityId: "csv",
    metadata: {
      recordCount: 1,
      tokenHash: "must-not-leak",
      nested: { password: "must-not-leak" },
    },
    createdAt: "2026-09-30T01:00:00.000Z",
  }]);

  assert.match(csv, /recordCount/);
  assert.match(csv, /\[REDACTED\]/);
  assert.doesNotMatch(csv, /must-not-leak/);
});

import assert from "node:assert/strict";
import test from "node:test";

import type { AdminOperationRecord } from "@/data/admin-operations";
import type { AuditLogRecord } from "@/data/audit-log-data";
import type { SystemHealthReport } from "@/data/system-health";
import { adminOperationsSheet, logSheet, systemHealthSheet } from "./admin-report-sheets";

const log = (overrides: Partial<AuditLogRecord>): AuditLogRecord => ({
  id: "1",
  actorType: "technician",
  actorId: "a1",
  actorName: "Budi",
  actorUsername: "budi",
  action: "authentication.login",
  entityType: "technician",
  entityId: "a1",
  metadata: null,
  createdAt: "2026-10-05T03:00:00.000Z",
  ...overrides,
});

test("the log sheet counts security events and redacts secrets in details", () => {
  const sheet = logSheet("Log", [
    log({}),
    log({ id: "2", action: "authentication.login_failed", actorId: null, actorName: null, actorUsername: null, metadata: { username: "x", passwordHash: "abc", nested: { token: "t", ok: 1 } } }),
    log({ id: "3", action: "authorization.denied" }),
  ]);
  assert.deepEqual(sheet.summary.map((item) => item.value), ["3", "1", "1", "0", "2"]);
  assert.equal(sheet.rows[1].actor, "—");
  const details = String(sheet.rows[1].details);
  assert.ok(details.includes("[REDACTED]"));
  assert.ok(!details.includes("abc") && !details.includes('"t"'));
  assert.ok(details.includes('"ok":1'));
  assert.equal(sheet.rows[0].time, "05/10/2026 10:00:00 WIB");
  assert.equal(sheet.tones.length, 3);
});

const operation = (overrides: Partial<AdminOperationRecord>): AdminOperationRecord => ({
  id: "INC-2026-0001",
  title: "Printer",
  division: "Finance",
  serviceDivision: "IT Team",
  status: "In Progress",
  workflowStatus: "assigned",
  currentAssignee: "Dimas",
  lastUpdatedAt: "2026-10-01T03:00:00.000Z",
  inactiveDays: 5,
  stalled: true,
  unassigned: false,
  invalidAssignment: false,
  canReassign: true,
  eligibleAgents: [],
  ...overrides,
});

test("admin operations list every attention reason and colour the worst ones", () => {
  const sheet = adminOperationsSheet("Admin operations", [
    operation({}),
    operation({ id: "2", stalled: false, unassigned: true, workflowStatus: "ready_for_assignment", currentAssignee: null }),
    operation({ id: "3", stalled: true, unassigned: false, invalidAssignment: true, inactiveDays: 9 }),
  ]);
  assert.deepEqual(sheet.summary.map((item) => item.value), ["3", "2", "1", "1"]);
  assert.equal(sheet.rows[0].attention, "Stalled 5 days");
  assert.equal(sheet.rows[1].attention, "Awaiting assignment");
  assert.equal(sheet.rows[1].assignee, "—");
  assert.equal(sheet.rows[2].attention, "Invalid assignment · Stalled 9 days");
  assert.deepEqual(sheet.tones, ["bad", "wait", "bad"]);
});

test("system health keeps each check with a status tone", () => {
  const report: SystemHealthReport = {
    overallStatus: "warning",
    checkedAt: "2026-10-05T03:00:00.000Z",
    checks: [
      { id: "database", label: "Database", status: "healthy", value: "Connected", detail: "ok", responseTimeMs: 12 },
      { id: "storage", label: "Storage", status: "critical", value: "95% used", detail: "low space" },
      { id: "runtime", label: "Runtime", status: "unknown", value: "—", detail: "n/a" },
    ],
  };
  const sheet = systemHealthSheet("System health", report);
  assert.equal(sheet.summary[0].value, "Warning");
  assert.deepEqual(sheet.tones, ["ok", "bad", "none"]);
  assert.equal(sheet.rows[0].responseTime, 12);
  assert.equal(sheet.rows[1].responseTime, null);
});

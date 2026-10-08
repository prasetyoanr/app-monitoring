import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminAlerts, type AdminAlertInput } from "./admin-alerts";

const calm: AdminAlertInput = { stalled: 0, unassigned: 0, lockedAccounts: 0, failedLogins: 0, health: "healthy" };

test("no alerts when everything is normal", () => {
  assert.deepEqual(buildAdminAlerts(calm), []);
});

test("unknown health does not raise an alert", () => {
  assert.deepEqual(buildAdminAlerts({ ...calm, health: "unknown" }), []);
});

test("every condition produces one alert with a target page", () => {
  const alerts = buildAdminAlerts({ stalled: 2, unassigned: 1, lockedAccounts: 3, failedLogins: 9, health: "critical" });
  const byId = Object.fromEntries(alerts.map((alert) => [alert.id, alert.href]));
  assert.deepEqual(byId, {
    "system-health": "/system-health",
    "locked-accounts": "/accounts?status=locked",
    "failed-logins": "/audit-logs?event=failed_login&period=24h",
    "stalled-work": "/admin-operations?view=stalled",
    "awaiting-assignment": "/inbox?workflow=ready_for_assignment",
  });
});

test("critical alerts come before warnings", () => {
  const alerts = buildAdminAlerts({ stalled: 1, unassigned: 1, lockedAccounts: 1, failedLogins: 0, health: "warning" });
  assert.deepEqual(alerts.map((alert) => alert.id), ["locked-accounts", "system-health", "stalled-work", "awaiting-assignment"]);
});

test("a few failed sign-ins stay below the alert threshold", () => {
  assert.deepEqual(buildAdminAlerts({ ...calm, failedLogins: 4 }), []);
  assert.equal(buildAdminAlerts({ ...calm, failedLogins: 5 }).length, 1);
});

test("titles use singular and plural correctly", () => {
  assert.equal(buildAdminAlerts({ ...calm, lockedAccounts: 1 })[0].title, "1 account locked");
  assert.equal(buildAdminAlerts({ ...calm, lockedAccounts: 2 })[0].title, "2 accounts locked");
});

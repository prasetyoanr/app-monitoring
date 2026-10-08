import assert from "node:assert/strict";
import test from "node:test";

import type { AccountRole } from "@/data/types";

import {
  availableReportTypes,
  planSummary,
  resolveReportPeriod,
  sourcesForType,
  ticketSummary,
  uniqueSheetName,
  usesStaffDatePicker,
} from "./role-report";

test("requesters have no reports; others get request and inbox; GA scope adds GA activity", () => {
  assert.deepEqual(availableReportTypes({ role: "requester", keepsGaPlan: false }), []);
  assert.deepEqual(availableReportTypes({ role: "approver", keepsGaPlan: false }), ["request", "inbox", "all"]);
  assert.deepEqual(availableReportTypes({ role: "service_agent", keepsGaPlan: true }), ["request", "inbox", "ga_activity", "all"]);
  assert.deepEqual(availableReportTypes({ role: "administrator", keepsGaPlan: false }), ["request", "inbox", "ga_activity", "log", "utility", "all"]);
});

test("'all' expands only to what the viewer may export", () => {
  assert.deepEqual(sourcesForType("all", { role: "receptionist", keepsGaPlan: false }), ["request", "inbox"]);
  assert.deepEqual(sourcesForType("all", { role: "final_approver", keepsGaPlan: true }), ["request", "inbox", "ga_activity"]);
  assert.deepEqual(sourcesForType("ga_activity", { role: "approver", keepsGaPlan: false }), []);
  assert.deepEqual(sourcesForType("request", { role: "requester", keepsGaPlan: false }), []);
});

test("log and utility are administrator-only, and 'all' for the administrator includes them", () => {
  for (const role of ["receptionist", "approver", "final_approver", "service_agent"] as AccountRole[]) {
    assert.deepEqual(sourcesForType("log", { role, keepsGaPlan: true }), []);
    assert.deepEqual(sourcesForType("utility", { role, keepsGaPlan: true }), []);
  }
  assert.deepEqual(sourcesForType("all", { role: "administrator", keepsGaPlan: false }), ["request", "inbox", "ga_activity", "log", "utility"]);
});

test("the GA Activity style picker supports a single day and the Friday–Thursday period", () => {
  // 2026-10-07 is a Wednesday; its reporting period runs Fri 2026-10-02 to Thu 2026-10-08.
  assert.deepEqual(resolveReportPeriod({ mode: "period", date: "2026-10-07" }), { start: "2026-10-02", end: "2026-10-08", label: "2026-10-02_to_2026-10-08" });
  assert.deepEqual(resolveReportPeriod({ mode: "period", date: "2026-10-02" })?.start, "2026-10-02");
  assert.deepEqual(resolveReportPeriod({ mode: "date", date: "2026-10-07" }), { start: "2026-10-07", end: "2026-10-07", label: "2026-10-07" });
  assert.equal(resolveReportPeriod({ mode: "date", date: "2026-02-31" }), null);
  assert.equal(resolveReportPeriod({ mode: "period", date: "" }), null);
  assert.equal(usesStaffDatePicker("ga_activity"), true);
  assert.equal(usesStaffDatePicker("all"), true);
  assert.equal(usesStaffDatePicker("log"), false);
  assert.equal(usesStaffDatePicker("inbox"), false);
});

test("periods are validated, including impossible calendar dates", () => {
  assert.deepEqual(resolveReportPeriod({ mode: "month", month: "2026-02" }), { start: "2026-02-01", end: "2026-02-28", label: "2026-02" });
  assert.equal(resolveReportPeriod({ mode: "month", month: "2026-13" }), null);
  assert.equal(resolveReportPeriod({ mode: "range", startDate: "2026-10-05", endDate: "2026-10-01" }), null);
  assert.equal(resolveReportPeriod({ mode: "range", startDate: "2026-02-31", endDate: "2026-03-01" }), null);
  assert.equal(resolveReportPeriod({ mode: "range", startDate: "2026-10-01", endDate: "2026-10-05" })?.start, "2026-10-01");
});

test("sheet names respect Excel limits and stay unique", () => {
  const used = new Set<string>();
  assert.equal(uniqueSheetName("Budi", used), "Budi");
  assert.equal(uniqueSheetName("budi", used), "budi (2)");
  assert.equal(uniqueSheetName("A/B: [x]?", used), "A B x");
  const long = uniqueSheetName("N".repeat(40), used);
  assert.equal(long.length, 31);
  assert.equal(uniqueSheetName("N".repeat(40), used).length, 31);
  assert.notEqual(long, uniqueSheetName("N".repeat(40), used));
  assert.equal(uniqueSheetName("   ", used), "Sheet");
});

test("ticket and plan summaries count states and average completion days", () => {
  const summary = ticketSummary([
    { tone: "ok", completedDays: 2 },
    { tone: "ok", completedDays: 1 },
    { tone: "run", completedDays: null },
    { tone: "bad", completedDays: null },
  ]);
  assert.deepEqual(summary.map((item) => item.value), ["4", "2", "1", "1", "1.5"]);
  assert.equal(ticketSummary([]).at(-1)?.value, "—");

  const plans = planSummary([{ status: "completed" }, { status: "in_progress" }, { status: "planned" }, { status: "cancelled" }]);
  assert.equal(plans.at(-1)?.value, "33%");
  assert.equal(planSummary([]).at(-1)?.value, "—");
});

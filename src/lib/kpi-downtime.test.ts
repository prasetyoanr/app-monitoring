import assert from "node:assert/strict";
import test from "node:test";

import { downtimeMonth, downtimeWeekEnd, expectedDowntimeWeeks } from "./kpi-downtime";

test("minggu lintas bulan dicatat tepat pada bulan hari Minggu", () => {
  assert.equal(downtimeWeekEnd("2026-10-26"), "2026-11-01");
  assert.equal(downtimeWeekEnd("2026-10-27"), null);
  assert.ok(!expectedDowntimeWeeks(2026, 10).includes("2026-10-26"));
  assert.ok(expectedDowntimeWeeks(2026, 11).includes("2026-10-26"));
});

test("pemakaian batas bulanan dapat 45 persen dengan capaian 100 persen", () => {
  const starts = expectedDowntimeWeeks(2026, 11);
  const weeks = starts.map((weekStart) => ({ weekStart, hours: 10.8, source: "manual" as const }));
  const result = downtimeMonth(2026, 11, weeks, 20, 24);
  assert.equal(result.utilization, 45);
  assert.equal(result.achievement, 100);
  assert.equal(result.score, 20);
});

test("satu minggu melebihi 24 jam menurunkan nilai walau total bulan masih aman", () => {
  const weeks = expectedDowntimeWeeks(2026, 11).map((weekStart, index) => ({ weekStart, hours: index === 0 ? 30 : 0, source: "manual" as const }));
  const result = downtimeMonth(2026, 11, weeks, 20, 24);
  assert.ok((result.utilization ?? 0) < 100);
  assert.ok((result.achievement ?? 100) < 100);
});

test("minggu tanpa catatan bukan nol jam dan hasil bulan tetap kosong", () => {
  const start = expectedDowntimeWeeks(2026, 11)[0];
  const result = downtimeMonth(2026, 11, [{ weekStart: start, hours: 0, source: "manual" }], 20, 24);
  assert.equal(result.recorded, 1);
  assert.equal(result.achievement, null);
  assert.equal(result.score, null);
});

test("batas mingguan mengikuti target indikator", () => {
  const weeks = expectedDowntimeWeeks(2026, 11).map((weekStart) => ({ weekStart, hours: 18, source: "manual" as const }));
  assert.equal(downtimeMonth(2026, 11, weeks, 20, 24).achievement, 100);
  assert.equal(downtimeMonth(2026, 11, weeks, 20, 12).achievement, 50);
});

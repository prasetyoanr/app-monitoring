import assert from "node:assert/strict";
import test from "node:test";

import { isTargetInReportingPeriod, reportingPeriodStartForDate, shiftDate, workPlanInputError } from "./ga-work-plan";

test("reporting period uses Friday through Thursday", () => {
  assert.equal(reportingPeriodStartForDate("2026-10-02"), "2026-10-02");
  assert.equal(reportingPeriodStartForDate("2026-10-08"), "2026-10-02");
  assert.equal(reportingPeriodStartForDate("2026-10-09"), "2026-10-09");
  assert.equal(shiftDate("2026-10-02", 6), "2026-10-08");
  assert.equal(isTargetInReportingPeriod("2026-10-02", "2026-10-08"), true);
  assert.equal(isTargetInReportingPeriod("2026-10-02", "2026-10-09"), false);
});

test("work plan validation rejects invalid and out-of-period input", () => {
  assert.match(workPlanInputError({ title: "x", description: "", weekStart: "2026-10-02", targetMode: "date", targetDate: "2026-10-05" }) ?? "", /at least 3/);
  assert.match(workPlanInputError({ title: "Weekly inspection", description: "", weekStart: "2026-10-03", targetMode: "date", targetDate: "2026-10-05" }) ?? "", /Friday-to-Thursday/);
  assert.equal(workPlanInputError({ title: "Weekly inspection", description: "Check shared facilities", weekStart: "2026-10-02", targetMode: "date", targetDate: "2026-10-08" }), null);
  assert.match(workPlanInputError({ title: "Weekly inspection", description: "", weekStart: "2026-10-02", targetMode: "date", targetDate: "2026-10-09" }) ?? "", /reporting period/);
  assert.equal(workPlanInputError({ title: "Follow up vendor", description: "", weekStart: "2026-10-02", targetMode: "until_completed", targetDate: "" }), null);
  assert.match(workPlanInputError({ title: "Follow up vendor", description: "", weekStart: "2026-10-02", targetMode: "until_completed", targetDate: "2026-10-08" }) ?? "", /must not have/);
});

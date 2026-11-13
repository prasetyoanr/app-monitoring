import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateActuals,
  assessmentPeriods,
  calculateAchievement,
  checkpointActual,
  frequencyMonths,
  type KpiFrequency,
} from "./kpi-score";

const quarterly: KpiFrequency = { type: "quarterly", customMonths: 2 };

test("frequency presets map to months", () => {
  assert.equal(frequencyMonths({ type: "monthly", customMonths: 2 }), 1);
  assert.equal(frequencyMonths(quarterly), 3);
  assert.equal(frequencyMonths({ type: "half_yearly", customMonths: 2 }), 6);
  assert.equal(frequencyMonths({ type: "yearly", customMonths: 2 }), 12);
  assert.equal(frequencyMonths({ type: "custom", customMonths: 4 }), 4);
  assert.equal(frequencyMonths({ type: "custom", customMonths: 0 }), 1);
  assert.equal(frequencyMonths({ type: "custom", customMonths: 99 }), 12);
});

test("assessment periods cover the whole year", () => {
  assert.deepEqual(assessmentPeriods(quarterly).map((p) => p.endMonth), [3, 6, 9, 12]);
  assert.deepEqual(assessmentPeriods({ type: "custom", customMonths: 5 }).map((p) => p.endMonth), [5, 10, 12]);
  assert.deepEqual(assessmentPeriods({ type: "yearly", customMonths: 2 }).map((p) => p.label), ["Jan–Dec"]);
  assert.equal(assessmentPeriods({ type: "monthly", customMonths: 2 }).length, 12);
});

test("aggregation types", () => {
  assert.equal(aggregateActuals("average", [90, 80]), 85);
  assert.equal(aggregateActuals("cumulative", [1, 2, 3]), 6);
  assert.equal(aggregateActuals("latest", [1, 2, 3]), 3);
  assert.equal(aggregateActuals("average", []), null);
});

test("checkpoint actual only counts periods up to the cutoff", () => {
  const actuals = { 3: 1, 6: 1, 9: 2 };
  assert.equal(checkpointActual(quarterly, "cumulative", actuals, "mid"), 2);
  assert.equal(checkpointActual(quarterly, "cumulative", actuals, "end"), 4);
  assert.equal(checkpointActual(quarterly, "latest", actuals, "end"), 2);
  // A yearly KPI is only recorded at year end, so Mid-Year has no value yet.
  const yearly: KpiFrequency = { type: "yearly", customMonths: 2 };
  assert.equal(checkpointActual(yearly, "average", { 12: 80 }, "mid"), null);
  assert.equal(checkpointActual(yearly, "average", { 12: 80 }, "end"), 80);
  // An optional interim value gives a yearly KPI a Mid-Year score without being averaged into the year end.
  assert.equal(checkpointActual(yearly, "average", { 6: 70, 12: 80 }, "mid"), 70);
  assert.equal(checkpointActual(yearly, "average", { 6: 70, 12: 80 }, "end"), 80);
  assert.equal(checkpointActual(yearly, "average", { 6: 70 }, "end"), null);
  // Values of periods that no longer exist after a frequency change are ignored.
  assert.equal(checkpointActual(quarterly, "cumulative", { 4: 9 }, "end"), null);
});

test("achievement relates actual to target by polarity", () => {
  assert.equal(calculateAchievement("positive", 90, 81), 90);
  assert.equal(calculateAchievement("positive", 90, 120), 100);
  assert.equal(calculateAchievement("negative", 15, 12), 100);
  assert.equal(calculateAchievement("negative", 15, 18), 80);
  assert.equal(calculateAchievement("negative", 15, 40), 0);
  assert.equal(calculateAchievement("positive", 90, null), null);
  assert.equal(calculateAchievement("positive", 0, 5), null);
});

test("cumulative downtime improves as outage hours fall toward the allowed limit", () => {
  const monthly: KpiFrequency = { type: "monthly", customMonths: 2 };
  const midYearHours = checkpointActual(monthly, "cumulative", { 1: 8, 2: 10 }, "mid");
  const reducedHours = checkpointActual(monthly, "cumulative", { 1: 6, 2: 9 }, "mid");
  assert.equal(midYearHours, 18);
  assert.equal(reducedHours, 15);
  assert.equal(calculateAchievement("negative", 15, midYearHours), 80);
  assert.equal(calculateAchievement("negative", 15, reducedHours), 100);
  assert.equal(calculateAchievement("negative", 15, 0), 100);
});

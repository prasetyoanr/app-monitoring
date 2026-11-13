import assert from "node:assert/strict";
import test from "node:test";

import { calculateKpiSurveyPeriods, type KpiSurveyRating } from "./kpi-survey";

const rows: KpiSurveyRating[] = [
  { surveyId: "selected", submissionId: "one", month: 7, value: 5 },
  { surveyId: "selected", submissionId: "one", month: 7, value: 4 },
  { surveyId: "selected", submissionId: "one", month: 7, value: 2 },
  { surveyId: "other", submissionId: "two", month: 7, value: 1 },
  { surveyId: "selected", submissionId: "three", month: 8, value: "5" },
];

test("KPI survei menghitung hanya rating valid dari survei terpilih", () => {
  const result = calculateKpiSurveyPeriods({ type: "quarterly", customMonths: 1 }, ["selected"], rows);
  assert.equal(result.actuals[9], 2 / 3 * 100);
  assert.equal(result.evidence[9]?.ratings, 3);
  assert.equal(result.evidence[9]?.respondents, 1);
  assert.equal(result.actuals[6], undefined);
});

test("periode tahunan memisahkan hasil semester dan akhir tahun tanpa menganggap kosong sebagai nol", () => {
  const result = calculateKpiSurveyPeriods({ type: "yearly", customMonths: 1 }, ["selected"], rows);
  assert.equal(result.actuals[6], undefined);
  assert.equal(result.actuals[12], 2 / 3 * 100);
});

test("periode custom terakhir tidak mengulang bulan sebelumnya", () => {
  const customRows: KpiSurveyRating[] = [
    { surveyId: "selected", submissionId: "a", month: 8, value: 1 },
    { surveyId: "selected", submissionId: "b", month: 11, value: 5 },
  ];
  const result = calculateKpiSurveyPeriods({ type: "custom", customMonths: 5 }, ["selected"], customRows);
  assert.equal(result.actuals[10], 0);
  assert.equal(result.actuals[12], 100);
});

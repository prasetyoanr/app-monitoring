import { entryPeriods, type KpiActuals, type KpiFrequency } from "@/lib/kpi-score";
import { isSurveyRating } from "@/lib/survey-metrics";

export type KpiSurveyRating = { surveyId: string; submissionId: string; month: number; value: unknown };
export type KpiSurveyEvidence = { ratings: number; satisfied: number; respondents: number };

/** Uses the same satisfied rating rule as Surveys: answers of 4 or 5 count as satisfied. */
export function calculateKpiSurveyPeriods(frequency: KpiFrequency, selectedSurveyIds: string[], rows: KpiSurveyRating[]) {
  const selected = new Set(selectedSurveyIds);
  const actuals: KpiActuals = {};
  const evidence: Record<number, KpiSurveyEvidence> = {};
  let previousEnd = 0;
  for (const period of entryPeriods(frequency)) {
    const start = frequency.type === "yearly" ? 1 : previousEnd + 1;
    previousEnd = period.endMonth;
    const periodRows = rows.filter((row) => selected.has(row.surveyId) && row.month >= start && row.month <= period.endMonth && isSurveyRating(row.value));
    if (!periodRows.length) continue;
    const satisfied = periodRows.filter((row) => Number(row.value) >= 4).length;
    actuals[period.endMonth] = satisfied / periodRows.length * 100;
    evidence[period.endMonth] = { ratings: periodRows.length, satisfied, respondents: new Set(periodRows.map((row) => row.submissionId)).size };
  }
  return { actuals, evidence };
}

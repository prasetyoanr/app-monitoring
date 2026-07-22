import type { SurveyKpiCategory } from "@/data/survey-types";

export const SURVEY_SATISFACTION_TARGET = 90;

export const SURVEY_KPI_CATEGORIES: Record<
  SurveyKpiCategory,
  { code: string; label: string }
> = {
  installation: { code: "KPI-01", label: "Installation Quality" },
  repair: { code: "KPI-02", label: "Repair Quality" },
};

export const SURVEY_RATING_LABELS = {
  1: "Very Dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very Satisfied",
} as const;

export type SurveyRating = keyof typeof SURVEY_RATING_LABELS;

export function isSurveyRating(value: unknown): value is SurveyRating {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function isSatisfiedRating(value: unknown) {
  return isSurveyRating(value) && value >= 4;
}

export function calculateSurveyRatingMetrics(values: unknown[]) {
  const ratings = values.filter(isSurveyRating);
  const responseCount = ratings.length;
  const satisfiedCount = ratings.filter(isSatisfiedRating).length;
  const averageRating = responseCount
    ? ratings.reduce((sum, rating) => sum + rating, 0) / responseCount
    : 0;
  const satisfactionScore = responseCount
    ? (satisfiedCount / responseCount) * 100
    : 0;
  const targetAchievement = responseCount
    ? Math.min(
        (satisfactionScore / SURVEY_SATISFACTION_TARGET) * 100,
        100,
      )
    : 0;

  return {
    ratings,
    responseCount,
    satisfiedCount,
    averageRating,
    satisfactionScore,
    targetAchievement,
  };
}

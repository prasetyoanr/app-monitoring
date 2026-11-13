export type KpiPolarity = "positive" | "negative";
export type KpiFrequencyType = "monthly" | "custom" | "quarterly" | "half_yearly" | "yearly";
export type KpiFrequency = { type: KpiFrequencyType; customMonths: number };
export type KpiAggregation = "average" | "cumulative" | "latest";
export type KpiKind = "routine" | "improvement";
export type KpiPeriodKey = "mid" | "end";
// Actual value recorded for an assessment period, keyed by the month the period ends (1-12).
export type KpiActuals = Record<number, number>;

export const KPI_FREQUENCY_LABELS: Record<KpiFrequencyType, string> = {
  monthly: "Monthly",
  custom: "Custom monthly",
  quarterly: "Every 3 months",
  half_yearly: "Every 6 months",
  yearly: "Yearly",
};

export const KPI_AGGREGATION_LABELS: Record<KpiAggregation, string> = {
  average: "Rata-rata",
  cumulative: "Akumulatif (jumlah)",
  latest: "Nilai terbaru",
};

export const KPI_KIND_LABELS: Record<KpiKind, string> = {
  routine: "Routine",
  improvement: "Improvement",
};

export const KPI_PERIOD_LABELS: Record<KpiPeriodKey, string> = {
  mid: "Mid-Year",
  end: "End-Year",
};

// Mid-Year counts the periods that end by June, End-Year counts the whole year.
export const KPI_PERIOD_CUTOFF_MONTH: Record<KpiPeriodKey, number> = {
  mid: 6,
  end: 12,
};

export const KPI_CUSTOM_MONTHS_MAX = 12;

export function clampCustomMonths(value: number) {
  const whole = Math.trunc(value);
  if (!Number.isFinite(whole)) return 1;
  return Math.min(Math.max(whole, 1), KPI_CUSTOM_MONTHS_MAX);
}

export function frequencyMonths(frequency: KpiFrequency) {
  switch (frequency.type) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "half_yearly":
      return 6;
    case "yearly":
      return 12;
    case "custom":
      return clampCustomMonths(frequency.customMonths);
  }
}

export function frequencyLabel(frequency: KpiFrequency) {
  if (frequency.type !== "custom") return KPI_FREQUENCY_LABELS[frequency.type];
  const months = frequencyMonths(frequency);
  return months === 1 ? "Every month" : `Every ${months} months`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type AssessmentPeriod = { endMonth: number; label: string };

/** The periods of one year in which a value is recorded, e.g. every 5 months: Jan-May, Jun-Oct, Nov-Dec. */
export function assessmentPeriods(frequency: KpiFrequency): AssessmentPeriod[] {
  const step = frequencyMonths(frequency);
  const periods: AssessmentPeriod[] = [];
  for (let start = 1; start <= 12; start += step) {
    const end = Math.min(start + step - 1, 12);
    periods.push({
      endMonth: end,
      label: start === end ? MONTH_NAMES[end - 1] : `${MONTH_NAMES[start - 1]}–${MONTH_NAMES[end - 1]}`,
    });
  }
  return periods;
}

/**
 * The values a member can enter. Same as the assessment periods, except a yearly KPI also accepts an
 * optional interim value at Mid-Year, so it can be scored mid-year without changing its frequency.
 */
export function entryPeriods(frequency: KpiFrequency): AssessmentPeriod[] {
  if (frequency.type !== "yearly") return assessmentPeriods(frequency);
  return [{ endMonth: 6, label: "Mid-Year (optional)" }, { endMonth: 12, label: "Jan–Dec" }];
}

/** Turns the values of several periods into one actual, using the KPI's calculation type. */
export function aggregateActuals(aggregation: KpiAggregation, values: number[]) {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  if (aggregation === "cumulative") return sum;
  if (aggregation === "latest") return values[values.length - 1];
  return sum / values.length;
}

/** Actual up to a checkpoint (Mid-Year or End-Year) from the values recorded per period. */
export function checkpointActual(
  frequency: KpiFrequency,
  aggregation: KpiAggregation,
  actuals: KpiActuals,
  period: KpiPeriodKey,
) {
  const cutoff = KPI_PERIOD_CUTOFF_MONTH[period];
  if (frequency.type === "yearly") {
    // The interim value is a snapshot of the year so far, not a part to be combined with the year-end value.
    const value = actuals[cutoff];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  const values = assessmentPeriods(frequency)
    .filter((entry) => entry.endMonth <= cutoff)
    .map((entry) => actuals[entry.endMonth])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return aggregateActuals(aggregation, values);
}

/**
 * Achievement (0-100) of the actual against the target.
 * - positive: higher is better, capped at 100.
 * - negative: lower is better; above the target the value drops proportionally.
 */
export function calculateAchievement(
  polarity: KpiPolarity,
  target: number,
  actual: number | null,
) {
  if (actual === null || !Number.isFinite(actual) || target <= 0) return null;
  if (polarity === "positive") return Math.min((actual / target) * 100, 100);
  if (actual <= target) return 100;
  return Math.max(100 - ((actual - target) / target) * 100, 0);
}

export function calculateWeightedScore(weight: number, achievement: number | null) {
  return achievement === null ? null : (achievement * weight) / 100;
}

export function scoreTone(achievement: number | null) {
  if (achievement === null) return "gray" as const;
  if (achievement >= 100) return "green" as const;
  if (achievement >= 80) return "blue" as const;
  if (achievement >= 60) return "amber" as const;
  return "red" as const;
}

export function formatNumber(value: number | null, digits = 1) {
  if (value === null) return "-";
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(digits).replace(/\.0+$/, "");
}

export function describeActualRule(aggregation: KpiAggregation, frequency?: KpiFrequency) {
  if (aggregation === "cumulative") {
    if (frequency?.type === "yearly") {
      return "Frekuensi tahunan: isi total sampai pertengahan tahun dan total sampai akhir tahun secara terpisah. Kedua nilai tersebut tidak dijumlahkan lagi.";
    }
    return "Realisasi akumulatif = jumlah nilai setiap periode sampai batas penilaian. Gunakan untuk jam atau jumlah kegiatan, bukan menjumlahkan persentase.";
  }
  if (aggregation === "latest") {
    return "Realisasi = nilai terbaru yang tercatat sampai batas penilaian.";
  }
  return "Realisasi = rata-rata nilai setiap periode sampai batas penilaian.";
}

export function describeAchievementRule(polarity: KpiPolarity) {
  if (polarity === "positive") {
    return "Capaian = Realisasi ÷ Target × 100% (maksimal 100%). Semakin besar realisasi, semakin baik.";
  }
  return "Capaian = 100% jika realisasi tidak melebihi batas target. Jika melebihi target, capaian berkurang sesuai persentase kelebihannya (minimal 0%). Semakin sedikit, semakin baik.";
}

export const KPI_SCORE_RULE = "Nilai = Capaian × Bobot. Nilai akhir adalah jumlah nilai seluruh KPI.";

/** One line showing the calculation with real numbers, or null when it cannot be calculated yet. */
export function describeWorkedExample(
  polarity: KpiPolarity,
  target: number,
  unit: string,
  weight: number,
  actual: number | null,
) {
  const achievement = calculateAchievement(polarity, target, actual);
  if (actual === null || achievement === null) return null;
  const score = calculateWeightedScore(weight, achievement);
  const suffix = unit ? ` ${unit}` : "";
  const comparison =
    polarity === "positive"
      ? `${formatNumber(actual, 2)}${suffix} ÷ ${formatNumber(target, 2)}${suffix}`
      : actual <= target
        ? `${formatNumber(actual, 2)}${suffix} tidak melebihi batas ${formatNumber(target, 2)}${suffix}`
        : `${formatNumber(actual, 2)}${suffix} melebihi batas ${formatNumber(target, 2)}${suffix}`;
  return `${comparison} → capaian ${formatNumber(achievement, 1)}% × bobot ${formatNumber(weight, 2)}% = ${formatNumber(score, 2)} poin`;
}

import { calculateAchievement } from "@/lib/kpi-score";

export type DowntimeWeek = { weekStart: string; hours: number; source: "manual" | "monitoring" };

function dateFromIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function downtimeWeekEnd(weekStart: string) {
  const date = dateFromIso(weekStart);
  if (!date || date.getUTCDay() !== 1) return null;
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function expectedDowntimeWeeks(year: number, month: number) {
  const result: string[] = [];
  const day = new Date(Date.UTC(year, month - 1, 1));
  while (day.getUTCMonth() === month - 1) {
    if (day.getUTCDay() === 0) {
      const start = new Date(day);
      start.setUTCDate(start.getUTCDate() - 6);
      result.push(start.toISOString().slice(0, 10));
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return result;
}

export function downtimeMonth(year: number, month: number, weeks: DowntimeWeek[], weight: number, weeklyLimit: number) {
  const starts = expectedDowntimeWeeks(year, month);
  const entries = starts.map((start) => weeks.find((entry) => entry.weekStart === start)).filter((entry): entry is DowntimeWeek => Boolean(entry));
  const hours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const allowance = starts.length * weeklyLimit;
  const complete = entries.length === starts.length;
  const achievement = complete ? entries.reduce((sum, entry) => sum + (calculateAchievement("negative", weeklyLimit, entry.hours) ?? 0), 0) / starts.length : null;
  return { expected: starts.length, recorded: entries.length, hours, allowance, utilization: complete ? hours / allowance * 100 : null, achievement, score: achievement === null ? null : achievement * weight / 100 };
}

export function downtimeCheckpoint(year: number, cutoff: number, weeks: DowntimeWeek[], weight: number, weeklyLimit: number) {
  const months = Array.from({ length: cutoff }, (_, index) => downtimeMonth(year, index + 1, weeks, weight, weeklyLimit));
  const complete = months.every((month) => month.achievement !== null);
  const hours = complete ? months.reduce((sum, month) => sum + month.hours, 0) : null;
  const achievement = complete ? months.reduce((sum, month) => sum + (month.achievement ?? 0), 0) / cutoff : null;
  return { actual: hours, achievement, score: achievement === null ? null : achievement * weight / 100 };
}

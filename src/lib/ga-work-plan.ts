export const gaWorkPlanStatuses = [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type GaWorkPlanStatus = (typeof gaWorkPlanStatuses)[number];

export const gaWorkPlanTargetModes = ["date", "until_completed"] as const;
export type GaWorkPlanTargetMode = (typeof gaWorkPlanTargetModes)[number];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isDateInput(value: string) {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function reportingPeriodStartForDate(value: string) {
  if (!isDateInput(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  const daysFromFriday = (date.getUTCDay() + 2) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromFriday);
  return date.toISOString().slice(0, 10);
}

export function shiftDate(value: string, days: number) {
  if (!isDateInput(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isFriday(value: string) {
  return isDateInput(value) && new Date(`${value}T00:00:00Z`).getUTCDay() === 5;
}

export function isTargetInReportingPeriod(periodStart: string, targetDate: string) {
  return isFriday(periodStart) && isDateInput(targetDate) && targetDate >= periodStart && targetDate <= shiftDate(periodStart, 6);
}

export function workPlanInputError(input: {
  title: string;
  description: string;
  weekStart: string;
  targetMode: string;
  targetDate: string;
}) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3) return "Plan title must contain at least 3 characters.";
  if (title.length > 200) return "Plan title must not exceed 200 characters.";
  if (description.length > 2_000) return "Plan notes must not exceed 2,000 characters.";
  if (!isFriday(input.weekStart)) return "Select a valid Friday-to-Thursday reporting period.";
  if (!gaWorkPlanTargetModes.includes(input.targetMode as GaWorkPlanTargetMode)) return "Select a valid target type.";
  if (input.targetMode === "date" && !isTargetInReportingPeriod(input.weekStart, input.targetDate)) return "Target date must be within the selected reporting period.";
  if (input.targetMode === "until_completed" && input.targetDate) return "An until-completed plan must not have a target date.";
  return null;
}

export function gaWorkPlanStatusLabel(status: GaWorkPlanStatus) {
  if (status === "in_progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

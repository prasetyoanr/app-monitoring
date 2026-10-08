import { jakartaDateInput } from "@/lib/jakarta-date";

const DAY_MS = 86_400_000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// A date typed as YYYY-MM-DD is a calendar day in Jakarta (the whole app works in WIB).
function startOfJakartaDay(value: string) {
  return new Date(`${value}T00:00:00+07:00`);
}

function isRealDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = startOfJakartaDay(value);
  return !Number.isNaN(parsed.getTime()) && jakartaDateInput(parsed) === value;
}

/**
 * Checks the completion date the IT staff typed. Returns the date, null when the field was
 * left empty (the caller keeps whatever is stored), or throws a message for the user.
 */
export function parseCompletionDate(
  value: string | null | undefined,
  requestedAt: Date,
  now = new Date(),
): string | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (!isRealDate(text)) throw new Error("Choose a valid completion date.");
  if (text < jakartaDateInput(requestedAt)) throw new Error("The completion date cannot be before the request date.");
  if (text > jakartaDateInput(now)) throw new Error("The completion date cannot be in the future.");
  return text;
}

/**
 * Completion time in whole days: from the request to the chosen completion date, or to the
 * moment of approval when no date was chosen.
 */
export function completedDaysBetween(
  requestedAt: Date,
  completionDate: string | null | undefined,
  fallbackAt: Date,
): number {
  const end = completionDate && isRealDate(completionDate) ? startOfJakartaDay(completionDate) : fallbackAt;
  return Math.max(0, Math.floor((end.getTime() - requestedAt.getTime()) / DAY_MS));
}

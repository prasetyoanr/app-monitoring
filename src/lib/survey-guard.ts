import { createHash } from "node:crypto";

// Protection for the public survey link. The link needs no login, so anyone who has it can
// submit; these rules keep one person or a script from flooding the results (and the AI
// analysis queue) without getting in the way of normal use.

// Many people share one office network address, so the per-address limit is generous: it only
// stops floods, not a department filling in the survey at the same time.
export const SURVEY_FLOOD_WINDOW_MS = 10 * 60_000;
export const SURVEY_FLOOD_LIMIT = 60;
export const SURVEY_DEVICE_COOKIE_MAX_AGE_SECONDS = 90 * 86_400;

export function surveyDeviceCookieName(code: string) {
  return `sv_${code}`;
}

type HeaderReader = (name: string) => string | null;

// The address the request came from. Behind a proxy it is the first entry of
// X-Forwarded-For; without one the header is absent and the value is "unknown".
export function surveyClientAddress(header: HeaderReader): string {
  const forwarded = header("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = forwarded || header("x-real-ip")?.trim() || "unknown";
  return raw.slice(0, 64);
}

// Only a hash is stored, never the address, and it is tied to one survey.
export function surveySubmitterHash(address: string, surveyId: string, pepper = ""): string {
  return createHash("sha256").update(`${pepper}|${surveyId}|${address}`).digest("hex");
}

export function surveyFloodExceeded(recentSubmissions: number): boolean {
  return recentSubmissions >= SURVEY_FLOOD_LIMIT;
}

// How long the "already answered on this device" marker lasts: until the survey closes, but
// never longer than the default.
export function surveyDeviceCookieMaxAge(expiresAt: Date | null, now = new Date()): number {
  if (!expiresAt) return SURVEY_DEVICE_COOKIE_MAX_AGE_SECONDS;
  const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
  return Math.max(60, Math.min(SURVEY_DEVICE_COOKIE_MAX_AGE_SECONDS, remaining));
}

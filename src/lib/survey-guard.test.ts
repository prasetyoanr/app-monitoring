import assert from "node:assert/strict";
import test from "node:test";

import {
  SURVEY_DEVICE_COOKIE_MAX_AGE_SECONDS,
  SURVEY_FLOOD_LIMIT,
  surveyClientAddress,
  surveyDeviceCookieMaxAge,
  surveyDeviceCookieName,
  surveyFloodExceeded,
  surveySubmitterHash,
} from "./survey-guard";

const headers = (values: Record<string, string>) => (name: string) => values[name] ?? null;

test("the client address is the first forwarded entry, then the real IP, then unknown", () => {
  assert.equal(surveyClientAddress(headers({ "x-forwarded-for": "10.0.0.5, 172.16.0.1" })), "10.0.0.5");
  assert.equal(surveyClientAddress(headers({ "x-real-ip": "10.0.0.9" })), "10.0.0.9");
  assert.equal(surveyClientAddress(headers({})), "unknown");
  assert.equal(surveyClientAddress(headers({ "x-forwarded-for": "x".repeat(200) })).length, 64);
});

test("the submitter hash is stable, per survey and does not contain the address", () => {
  const a = surveySubmitterHash("10.0.0.5", "survey-1");
  assert.equal(a, surveySubmitterHash("10.0.0.5", "survey-1"));
  assert.notEqual(a, surveySubmitterHash("10.0.0.5", "survey-2"));
  assert.notEqual(a, surveySubmitterHash("10.0.0.6", "survey-1"));
  assert.notEqual(a, surveySubmitterHash("10.0.0.5", "survey-1", "pepper"));
  assert.doesNotMatch(a, /10\.0\.0\.5/);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("a flood is only declared at the limit", () => {
  assert.equal(surveyFloodExceeded(SURVEY_FLOOD_LIMIT - 1), false);
  assert.equal(surveyFloodExceeded(SURVEY_FLOOD_LIMIT), true);
});

test("the device marker lasts until the survey closes, within the default", () => {
  const now = new Date("2026-10-14T00:00:00Z");
  assert.equal(surveyDeviceCookieMaxAge(null, now), SURVEY_DEVICE_COOKIE_MAX_AGE_SECONDS);
  assert.equal(surveyDeviceCookieMaxAge(new Date("2026-10-15T00:00:00Z"), now), 86_400);
  assert.equal(surveyDeviceCookieMaxAge(new Date("2027-12-31T00:00:00Z"), now), SURVEY_DEVICE_COOKIE_MAX_AGE_SECONDS);
  assert.equal(surveyDeviceCookieMaxAge(new Date("2026-10-13T00:00:00Z"), now), 60);
});

test("each survey has its own device cookie", () => {
  assert.equal(surveyDeviceCookieName("abc"), "sv_abc");
});

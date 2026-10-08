import assert from "node:assert/strict";
import test from "node:test";

import { completedDaysBetween, parseCompletionDate } from "./completion-date";

// Requested on 2026-10-01 (Jakarta midnight), "now" is 2026-10-08 12:00 WIB.
const requested = new Date("2026-10-01T00:00:00+07:00");
const now = new Date("2026-10-08T12:00:00+07:00");

test("an empty field means 'keep what is stored'", () => {
  assert.equal(parseCompletionDate("", requested, now), null);
  assert.equal(parseCompletionDate(undefined, requested, now), null);
  assert.equal(parseCompletionDate("  ", requested, now), null);
});

test("accepts today and any day since the request", () => {
  assert.equal(parseCompletionDate("2026-10-08", requested, now), "2026-10-08");
  assert.equal(parseCompletionDate("2026-10-01", requested, now), "2026-10-01");
  assert.equal(parseCompletionDate("2026-10-05", requested, now), "2026-10-05");
});

test("rejects dates before the request, in the future, or not real", () => {
  assert.throws(() => parseCompletionDate("2026-09-30", requested, now), /before the request date/);
  assert.throws(() => parseCompletionDate("2026-10-09", requested, now), /future/);
  assert.throws(() => parseCompletionDate("2026-02-31", requested, now), /valid/);
  assert.throws(() => parseCompletionDate("08/10/2026", requested, now), /valid/);
});

test("uses Jakarta time around midnight", () => {
  // 2026-10-07 18:00 UTC is already 2026-10-08 01:00 in Jakarta.
  const justAfterMidnight = new Date("2026-10-07T18:00:00Z");
  assert.equal(parseCompletionDate("2026-10-08", requested, justAfterMidnight), "2026-10-08");
});

test("counts whole days up to the chosen date", () => {
  assert.equal(completedDaysBetween(requested, "2026-10-01", now), 0);
  assert.equal(completedDaysBetween(requested, "2026-10-04", now), 3);
  assert.equal(completedDaysBetween(requested, "2026-10-08", now), 7);
});

test("falls back to the approval moment when no date was chosen", () => {
  assert.equal(completedDaysBetween(requested, null, now), 7);
  assert.equal(completedDaysBetween(requested, "", now), 7);
});

test("never returns a negative number", () => {
  assert.equal(completedDaysBetween(new Date("2026-10-10T00:00:00+07:00"), "2026-10-08", now), 0);
});

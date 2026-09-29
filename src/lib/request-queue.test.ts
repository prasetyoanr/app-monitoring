import assert from "node:assert/strict";
import test from "node:test";
import { jakartaDateInput } from "./jakarta-date";
import { filterAndSortRequestQueue, formatQueueReportedAt } from "./request-queue";

const record = (id: string, reportedAtIso: string) => ({ id, reportedAtIso, reportedDate: jakartaDateInput(new Date(reportedAtIso)) });
const records = [
  record("new", "2026-09-01T02:00:00.000Z"),
  record("late", "2026-08-31T16:59:59.000Z"),
  record("early", "2026-08-30T17:00:00.000Z"),
  record("before", "2026-08-30T16:59:59.000Z"),
];
const ids = (items: typeof records) => items.map((item) => item.id);

test("date range includes the entire Jakarta day, including UTC date rollover", () => {
  assert.deepEqual(ids(filterAndSortRequestQueue(records, "2026-08-31", "2026-08-31", "oldest")), ["early", "late"]);
});

test("oldest/newest sorting includes time and never mutates incoming records", () => {
  const original = [...records];
  assert.deepEqual(ids(filterAndSortRequestQueue(records, "", "", "oldest")), ["before", "early", "late", "new"]);
  assert.deepEqual(ids(filterAndSortRequestQueue(records, "", "", "newest")), ["new", "late", "early", "before"]);
  assert.deepEqual(records, original);
});

test("one-sided dates and empty or invalid ranges are predictable", () => {
  assert.deepEqual(ids(filterAndSortRequestQueue(records, "2026-09-01", "", "oldest")), ["new"]);
  assert.deepEqual(ids(filterAndSortRequestQueue(records, "", "2026-08-30", "oldest")), ["before"]);
  assert.deepEqual(filterAndSortRequestQueue(records, "2026-09-10", "", "oldest"), []);
  assert.deepEqual(filterAndSortRequestQueue(records, "2026-09-01", "2026-08-30", "oldest"), []);
});

test("equal timestamps have deterministic ID ordering", () => {
  const tied = [record("B", records[0].reportedAtIso), record("A", records[0].reportedAtIso)];
  assert.deepEqual(ids(filterAndSortRequestQueue(tied, "", "", "oldest")), ["A", "B"]);
});

test("refreshed records are filtered and sorted with the same selection", () => {
  const refreshed = [...records, record("middle", "2026-08-31T05:00:00.000Z")];
  assert.deepEqual(ids(filterAndSortRequestQueue(refreshed, "2026-08-31", "2026-08-31", "oldest")), ["early", "middle", "late"]);
});

test("reported timestamp explicitly displays Jakarta date, time and WIB", () => {
  assert.equal(formatQueueReportedAt("2026-08-30T17:00:00.000Z"), "31 Aug 2026, 00:00 WIB");
});

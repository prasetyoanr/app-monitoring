import assert from "node:assert/strict";
import test from "node:test";

import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_WRITE_INTERVAL_MS, ONLINE_WINDOW_MS, lastSeenLabel, presenceOf } from "./presence";

const now = new Date("2026-10-09T10:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

test("active within 90 seconds is online, later is offline", () => {
  assert.equal(presenceOf(ago(0), now), "online");
  assert.equal(presenceOf(ago(90_000), now), "online");
  assert.equal(presenceOf(ago(90_000 + 1000), now), "offline");
});

test("a heartbeat tolerates missing two pings before showing offline", () => {
  assert.equal(HEARTBEAT_INTERVAL_MS * 3, ONLINE_WINDOW_MS);
  assert.equal(HEARTBEAT_WRITE_INTERVAL_MS < HEARTBEAT_INTERVAL_MS, true);
});

test("no session activity means offline", () => {
  assert.equal(presenceOf(null, now), "offline");
  assert.equal(presenceOf(undefined, now), "offline");
});

test("last seen reads naturally", () => {
  assert.equal(lastSeenLabel(null, now), "Not seen yet");
  assert.equal(lastSeenLabel(ago(20_000), now), "Just now");
  assert.equal(lastSeenLabel(ago(7 * 60_000), now), "7 min ago");
  assert.equal(lastSeenLabel(ago(3 * 3_600_000), now), "3 h ago");
  assert.equal(lastSeenLabel(ago(2 * 86_400_000), now), "2 d ago");
  assert.equal(lastSeenLabel(ago(60 * 86_400_000), now), "Over a month ago");
});

test("a clock a little ahead never shows a negative time", () => {
  assert.equal(lastSeenLabel(new Date(now.getTime() + 5000), now), "Just now");
});

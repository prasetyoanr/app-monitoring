import assert from "node:assert/strict";
import test from "node:test";

import { isTransientDatabaseReadError, retryTransientDatabaseRead } from "./db-read-retry";

test("retries a wrapped connection reset once", async () => {
  let calls = 0;
  const original = console.error;
  console.error = () => {};
  try {
    const result = await retryTransientDatabaseRead("test", async () => {
      calls += 1;
      if (calls === 1) throw new Error("Failed query", { cause: Object.assign(new Error("Connection terminated unexpectedly"), { code: "ECONNRESET" }) });
      return 7;
    });
    assert.equal(result, 7);
    assert.equal(calls, 2);
  } finally {
    console.error = original;
  }
});

test("does not retry SQL schema errors", async () => {
  const error = new Error("Failed query", { cause: Object.assign(new Error("relation does not exist"), { code: "42P01" }) });
  assert.equal(isTransientDatabaseReadError(error), false);
  let calls = 0;
  const original = console.error;
  console.error = () => {};
  try {
    await assert.rejects(retryTransientDatabaseRead("test", async () => { calls += 1; throw error; }), error);
    assert.equal(calls, 1);
  } finally {
    console.error = original;
  }
});

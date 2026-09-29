import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { config } from "dotenv";
import { Client } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
import { IssueEventHub } from "./issue-event-hub";
import { issueChangeQuery } from "./issue-event-query";

config({ path: [".env.local", ".env"], quiet: true });

test("PostgreSQL delivers to independent listeners only after commit, not rollback", { timeout: 30_000 }, async () => {
  const connectionString = process.env.DATABASE_LISTEN_URL ?? process.env.DATABASE_URL;
  assert(connectionString, "Configure DATABASE_URL before running the database integration test.");
  const channel = `ga_management_test_${randomBytes(8).toString("hex")}`;
  const config = { connectionString, connectionTimeoutMillis: 5_000, query_timeout: 5_000, application_name: "ga_management_realtime_test" };
  const publisher = new Client(config);
  const listeners: Client[] = [];
  const stops: (() => void)[] = [];
  const counts = [0, 0];
  let lastStatus = "";
  try {
    await publisher.connect();
    // A session-local temporary table shadows the real table for the exact
    // production notification query. No real request is inserted or updated.
    await publisher.query(`CREATE TEMP TABLE troubleshooting_issues (
      id text, division text, service_division_id text, source text,
      workflow_enabled boolean, workflow_status text, approver_id text,
      final_approver_id text, assigned_technician_id text
    )`);
    await publisher.query(`INSERT INTO pg_temp.troubleshooting_issues VALUES
      ('TR-0000-0000', 'Test', 'test-division', 'division_request', true, 'waiting_approver', null, null, null)`);

    await Promise.all(counts.map((_, index) => new Promise<void>((resolve, reject) => {
      const hub = new IssueEventHub(() => {
        const listener = new Client(config); listeners.push(listener); return listener;
      }, channel);
      stops.push(hub.subscribe((event) => {
        if (event.type === "ready") resolve();
        if (event.type === "unavailable") reject(new Error("The test LISTEN connection was unavailable."));
        if (event.type === "change") { counts[index]++; lastStatus = event.audience.workflowStatus; }
      }));
    })));
    const query = new PgDialect().sqlToQuery(issueChangeQuery("TR-0000-0000", channel));
    await publisher.query("BEGIN");
    await publisher.query(query.sql, query.params);
    await publisher.query("ROLLBACK");
    await delay(50);
    assert.deepEqual(counts, [0, 0]);

    await publisher.query("BEGIN");
    await publisher.query("UPDATE pg_temp.troubleshooting_issues SET workflow_status = 'ready_for_assignment'");
    await publisher.query(query.sql, query.params);
    await delay(50);
    assert.deepEqual(counts, [0, 0], "Uncommitted approvals must not reach browsers.");
    await publisher.query("COMMIT");
    for (let attempt = 0; attempt < 50 && counts.some((count) => count === 0); attempt++) await delay(20);
    assert.deepEqual(counts, [1, 1]);
    assert.equal(lastStatus, "ready_for_assignment");
  } finally {
    stops.forEach((stop) => stop());
    await Promise.allSettled([publisher.end(), ...listeners.map((listener) => listener.end())]);
  }
});

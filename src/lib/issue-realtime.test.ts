import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { setImmediate as nextTick, setTimeout as delay } from "node:timers/promises";
import type { Client } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
import type { AccountRole } from "@/data/types";
import { canReceiveIssueChange, ISSUE_EVENT_CHANNEL, type IssueAudience } from "./issue-events";
import { IssueEventHub } from "./issue-event-hub";
import { issueChangeQuery } from "./issue-event-query";
import { createIssueEventStream } from "./issue-event-stream";
import { createRefreshQueue } from "./refresh-queue";

const audience: IssueAudience = {
  division: "GA", serviceDivisionId: "it", source: "division_request",
  workflowEnabled: true, workflowStatus: "waiting_approver",
  approverId: null, finalApproverId: null, assignedTechnicianId: null,
};
const viewer = (role: AccountRole, divisionName: string | null = "Other", divisionId: string | null = "other", id = "user") => ({ role, divisionName, divisionId, id });

test("division request viewers remain scoped while reception and approval pools are global", () => {
  for (const role of ["requester", "service_agent"] as AccountRole[]) {
    assert.equal(canReceiveIssueChange(viewer(role, "GA"), audience), true);
    assert.equal(canReceiveIssueChange(viewer(role), audience), false);
  }
  assert.equal(canReceiveIssueChange(viewer("administrator"), audience), true);
  assert.equal(canReceiveIssueChange(viewer("receptionist"), audience), true);
  assert.equal(canReceiveIssueChange(viewer("receptionist"), { ...audience, source: "manual" }), false);
  assert.equal(canReceiveIssueChange(viewer("approver"), audience), true);
  assert.equal(canReceiveIssueChange(viewer("final_approver", "GA"), audience), false);
});

test("only the first approver keeps receiving an escalated or approved request", () => {
  const first = viewer("approver", null, null, "first");
  const other = viewer("approver", null, null, "other");
  assert.equal(canReceiveIssueChange(first, audience), true);
  assert.equal(canReceiveIssueChange(other, audience), true);

  const escalated = { ...audience, workflowStatus: "waiting_final_approver", approverId: first.id };
  assert.equal(canReceiveIssueChange(first, escalated), true);
  assert.equal(canReceiveIssueChange(other, escalated), false);
  assert.equal(canReceiveIssueChange(first, { ...escalated, workflowStatus: "ready_for_assignment" }), true);
  assert.equal(canReceiveIssueChange(other, { ...escalated, workflowStatus: "ready_for_assignment" }), false);
});

test("service agents only receive assigned work or legacy/manual division records", () => {
  const agent = viewer("service_agent", "IT", "it", "agent");
  assert.equal(canReceiveIssueChange(agent, audience), false);
  const assigned = { ...audience, workflowStatus: "assigned", assignedTechnicianId: "agent" };
  assert.equal(canReceiveIssueChange(agent, assigned), true);
  assert.equal(canReceiveIssueChange(agent, { ...assigned, assignedTechnicianId: "another" }), false);
  assert.equal(canReceiveIssueChange(agent, { ...assigned, serviceDivisionId: "finance" }), false);
  assert.equal(canReceiveIssueChange(agent, { ...audience, workflowEnabled: false }), true);
  assert.equal(canReceiveIssueChange(agent, { ...audience, source: "manual" }), true);
});

test("final approvers receive escalation and their own later decisions", () => {
  const user = viewer("final_approver");
  assert.equal(canReceiveIssueChange(user, audience), false);
  assert.equal(canReceiveIssueChange(user, { ...audience, workflowStatus: "waiting_final_approver" }), true);
  assert.equal(canReceiveIssueChange(user, { ...audience, workflowStatus: "ready_for_assignment", finalApproverId: user.id }), true);
});

class FakeClient extends EventEmitter {
  connectCalls = 0;
  ended = false;
  queries: string[] = [];
  async connect() { this.connectCalls++; }
  async query(query: string) { this.queries.push(query); }
  async end() { this.ended = true; this.emit("end"); }
  notify(payload: string, channel = ISSUE_EVENT_CHANNEL) { this.emit("notification", { channel, payload }); }
}

test("500 subscribers share one database listener and receive a valid signal", async () => {
  const client = new FakeClient();
  let created = 0;
  const hub = new IssueEventHub(() => { created++; return client as unknown as Client; });
  let changes = 0;
  let ready = 0;
  const unsubscribe = Array.from({ length: 500 }, () => hub.subscribe((event) => {
    if (event.type === "change") changes++;
    if (event.type === "ready") ready++;
  }));
  await nextTick();
  assert.equal(created, 1);
  assert.equal(ready, 500);
  assert.deepEqual(client.queries, [`LISTEN ${ISSUE_EVENT_CHANNEL}`]);
  client.notify("invalid json");
  client.notify("{}");
  client.notify(JSON.stringify(audience), "other_channel");
  assert.equal(changes, 0);
  client.notify(JSON.stringify(audience));
  assert.equal(changes, 500);
  unsubscribe.forEach((stop) => stop());
  client.notify(JSON.stringify(audience));
  assert.equal(changes, 500);
  client.emit("error", new Error("connection lost"));
  assert.equal(client.ended, true);
});

test("database disconnect closes streams and a new subscription reconnects", async () => {
  const clients: FakeClient[] = [];
  const hub = new IssueEventHub(() => {
    const client = new FakeClient(); clients.push(client); return client as unknown as Client;
  });
  let failures = 0;
  const first = hub.subscribe((event) => { if (event.type === "unavailable") failures++; });
  await nextTick();
  clients[0].emit("error", new Error("offline"));
  assert.equal(failures, 1);
  first();
  const second = hub.subscribe(() => {});
  await nextTick();
  assert.equal(clients.length, 2);
  assert.equal(clients[1].connectCalls, 1);
  second();
  clients[1].emit("error", new Error("cleanup"));
});

test("SSE filters audiences and sends no request IDs, reasons or routing metadata", async () => {
  const client = new FakeClient();
  const hub = new IssueEventHub(() => client as unknown as Client);
  const abort = new AbortController();
  const stream = createIssueEventStream(abort.signal, viewer("requester", "GA"), hub);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /^retry: /);
  assert.equal(decoder.decode((await reader.read()).value), "event: ready\ndata: {}\n\n");
  client.notify(JSON.stringify({ ...audience, division: "Unrelated" }));
  client.notify(JSON.stringify(audience));
  assert.equal(decoder.decode((await reader.read()).value), "event: changed\ndata: {}\n\n");
  await reader.cancel();
  abort.abort();
  client.emit("error", new Error("cleanup"));
});

test("aborted SSE never subscribes; expired SSE unsubscribes for reauthentication", async () => {
  let subscriptions = 0;
  let removals = 0;
  const hub = { subscribe: () => { subscriptions++; return () => { removals++; }; } };
  const abort = new AbortController();
  abort.abort();
  assert.equal((await createIssueEventStream(abort.signal, viewer("requester"), hub).getReader().read()).done, true);
  assert.equal(subscriptions, 0);
  const reader = createIssueEventStream(new AbortController().signal, viewer("requester"), hub, 5).getReader();
  await reader.read();
  assert.equal((await reader.read()).done, true);
  assert.equal(removals, 1);
});

test("refresh bursts coalesce; changes during a refresh are not lost", async () => {
  let runs = 0;
  const queue = createRefreshQueue(() => { runs++; }, () => true, 1);
  for (let i = 0; i < 500; i++) queue.request();
  await delay(10);
  assert.equal(runs, 1);
  queue.request();
  await delay(10);
  assert.equal(runs, 1);
  queue.complete();
  await delay(10);
  assert.equal(runs, 2);
  queue.complete();
  queue.dispose();
});

test("hidden tabs and disposed refresh queues do not send requests", async () => {
  let visible = false;
  let runs = 0;
  const queue = createRefreshQueue(() => { runs++; }, () => visible, 1);
  queue.request();
  await delay(10);
  assert.equal(runs, 0);
  visible = true;
  queue.request();
  await delay(10);
  assert.equal(runs, 1);
  queue.complete();
  queue.request();
  queue.dispose();
  await delay(10);
  assert.equal(runs, 1);
});

test("publication parameterizes IDs and channels and excludes private fields", () => {
  const query = new PgDialect().sqlToQuery(issueChangeQuery("TR-2608-1234"));
  assert(query.params.includes("TR-2608-1234"));
  assert(query.params.includes(ISSUE_EVENT_CHANNEL));
  assert(!query.sql.includes("TR-2608-1234"));
  assert(!query.sql.includes("description"));
  assert(!query.sql.includes("note"));
  assert.throws(() => new IssueEventHub(() => new FakeClient() as unknown as Client, "invalid;sql"));
});

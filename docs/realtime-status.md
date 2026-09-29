# Realtime request status

After Apply succeeds, the action's revalidated response updates the initiating page. Other authenticated browsers subscribe once per active tab to `/api/issue-events`. The signal refreshes their current server-rendered page and navigation counts without a full reload or resetting form inputs.

## Covered changes

- Reception review, direct assignment, approvals, escalation, rejection, returns and assignment.
- New division requests, service-agent work-status changes, and client QR approval/rejection.
- Inbox, Request, Overview and other authenticated pages receive the authorized invalidation. Overview and Inbox share the workflow-aware status label. Approval does not mean work is completed; report metrics still track operational status separately.
- Open read-only detail modals derive their record from fresh props instead of keeping an old snapshot. An inline status draft is only displayed while its own save is pending.

## Delivery and safety

- `pg_notify` runs inside the write transaction. PostgreSQL delivers the notification only after commit, never on rollback. Both previous and new audiences are signalled for workflow decisions so a request also disappears from a previous reviewer's queue.
- One dedicated PostgreSQL LISTEN connection is shared by active streams per server process. It does not consume the application's query pool and is released when idle. PostgreSQL connects publishers and listeners across separate app processes.
- The server filters events using the requesting division and service-inbox visibility. No issue ID, title, status, note or routing metadata is sent to the browser: only `changed` with an empty object. The normal authenticated data loaders fetch current permitted data.
- Reconnect/initial readiness triggers a fresh read to recover missed events. Streams renew every 2–2.5 minutes to recheck authentication. Heartbeats keep proxies from closing idle streams. Browser cancellation and slow readers clean up subscriptions.
- Refreshes are coalesced and serialized; a change during a refresh schedules one later refresh. Hidden tabs disconnect and fetch fresh data on return. While SSE is unavailable, a visible tab falls back to a refresh every 30–35 seconds, so fallback is not instantaneous.

## Deployment

- No migration or extra npm dependency is required. Run with a Node.js server that supports streaming HTTP responses.
- `DATABASE_LISTEN_URL` is optional and falls back to `DATABASE_URL`. It must connect to the same database through a direct or session-pooled connection; transaction-mode pooling does not support a persistent LISTEN session.
- Reverse proxies must allow streaming for `/api/issue-events`, disable response buffering, and allow long-lived requests. The route sets `X-Accel-Buffering: no` and no-cache headers. HTTP/2 is recommended when users open many tabs (HTTP/1 has a small per-origin connection limit).
- This is a status-invalidation transport, not a chat implementation. Measure database/query capacity separately before claiming support for 500 concurrent active users.

## Checks

`bun run test:workflow`, `bun run test:realtime`, `bun run typecheck`, and `bun run lint`.

`bun run test:realtime:db` checks real PostgreSQL commit/rollback delivery through two independent listeners. It uses a random test-only channel and a connection-local temporary table, never real request rows.

Authenticated acceptance: open a Request page (including its detail modal) and an Approver Inbox in different signed-in browser sessions. Apply an approval. Confirm both show Approved / Ready to Assign, the queue and bell change, and an unrelated division receives no request data. Repeat assignment, work status and completion; confirm drafts/scroll survive, hidden tabs catch up, and a failed action leaves the status unchanged. Disconnect/reconnect the network to test recovery.

References: [PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html), [node-postgres events](https://node-postgres.com/apis/client#events), [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

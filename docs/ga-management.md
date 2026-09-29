# General Affairs Management System

GA is the single intake division. Other divisions submit requests to GA; GA chooses
the execution unit and member. IT keeps its existing operational forms, work photo,
client signature, backup, reports, manual activity and historical records.

## Roles

| System role | Display label | Authority |
| --- | --- | --- |
| requester | Requester | Submit to GA and track the division's requests |
| receptionist | Admin GA | Review, assign directly with a reason, resolve administratively with a note, or request GA supervisor approval |
| approver | Atasan GA | Approve/reject/return/escalate; assign or resolve after approval |
| final_approver | Atasan Lebih Tinggi | Approve/reject/return only; assignment returns to the original GA supervisor |
| service_agent | Anggota GA | Handle assigned requests and record internal activities |
| administrator | Administrator | System configuration and existing administrative controls |

An established approval requirement cannot be removed after a return. Admin GA
cannot assign while approval is pending or after escalation. Organizational
approval is distinct from the IT client's work-completion signature.

## Receiving division versus execution unit

`receivingDivisionId` preserves GA intake. `serviceDivisionId` and its name become
the execution unit at assignment, allowing the existing IT scopes and inbox profile
to continue operating. Both changes are atomic with assignment/history/audit.
Only active service agents belonging to an `isGaUnit` unit may receive GA work.
Old requests without the receiving field retain destination-only assignment.

Master Data has an explicit **Unit pelaksana GA** checkbox. Only GA and IT are
initially enabled; no other existing service division is silently made part of GA.
The old service-target setting is retained for legacy IT behavior, but only GA is
offered as the destination for new requests, with server-side validation.

## Activities

`/activities` shows up to 100 recent internal activities and assigned requests.
GA admins and supervisors can monitor all enabled GA units. Members see their own
work. Non-IT members with the basic-service profile can record an internal activity
as In Progress or Completed and update its status through Inbox. IT continues to
record activities through its existing Add Issue flow.

## Local activation

Run `node scripts/activate-ga-management.mjs`. It only accepts a local database,
checks pending migrations, creates a custom PostgreSQL archive, verifies its table
listing, applies migrations, and confirms every existing issue identity remains.
Operational status may legitimately change when the local app is active; use
`compare-ga-backup.mjs` for field-level comparison. Backups live in ignored
`storage/database-backups/`. `PG_BIN` can
override the installed PostgreSQL binary directory. This is not a production
deployment script and archive-list verification is not a full restore rehearsal.

Business-specific mandatory approval thresholds (cost, vendors, risk) are not
invented here. Admin GA determines whether approval is required using the existing
workflow; once requested, that approval cannot be bypassed.

## Verification

Run typecheck, the workflow/GA assignment/request history/queue/realtime tests,
targeted ESLint, migration checks, and a production build. Temporary local browser
accounts can be created with `bunx tsx scripts/ga-smoke-fixture.ts` and removed with
the same command plus `--cleanup`; it never overwrites existing accounts. Cleanup
only targets those explicit fixture usernames and their submitted requests.

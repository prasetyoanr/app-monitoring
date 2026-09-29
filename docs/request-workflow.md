# Request workflow

## Roles and visibility

| Role | Responsibility |
| --- | --- |
| `requester` | Submit and track requests from their division; no service or approval actions. |
| `receptionist` | Admin GA reviews every new request; asks for approval, assigns directly, or resolves an administrative request. |
| `approver` | Atasan GA decides requests, may escalate, and assigns work after approval. |
| `final_approver` | The higher supervisor decides escalated requests; assignment returns to the original Atasan GA. |
| `service_agent` | A GA-unit member handles assigned requests. Existing IT operational features remain available. |
| `administrator` | Manage accounts/master data, view all requests, and perform workflow administration. Backup User remains administrator-only. |

All active accounts can also submit a request when they have a division. Self-registration creates a `requester`, never a service or approval account. Only an administrator can grant other roles.

## New-request flow

1. Submission creates an issue with operational status `New` and workflow status `submitted`.
2. Admin GA chooses **Ask Atasan GA**, **Assign Directly**, or **Resolve Administratively**. Direct assignment requires an enabled GA unit, an active member, and a reason explaining why supervisor approval is not needed (5–1000 characters). Administrative resolution also requires a result note.
3. Atasan GA can approve, reject, return for review, or escalate.
4. Final Approver can approve, reject, or return to the original Approver. Final approval cannot assign work or be bypassed by a first-level Approver.
5. Approval produces `ready_for_assignment`; the original Atasan GA assigns a member from an enabled GA unit or records an administrative resolution.
6. Once assigned, the service agent uses the existing work-status controls. IT work-photo and QR/client-signature approval remain separate from organizational approval.

Return and rejection require a note. Returning from the first level goes to Receptionist; returning from the final level goes to the original Approver. Receptionist cannot remove an established approval requirement after a return. Rejected requests are terminal in this version; resubmission is a new request.

The server validates role, current workflow state, requesting-division scope, original approver, eligible destination agent, and concurrent updates. Non-administrator approvers cannot approve their own requests. Decisions and internal notes are stored in `request_workflow_history` and the audit log. Internal notes are not included in the Request portal DTO.

## GA queue dates

Admin GA queue entries show the original report date and time in WIB. **From date** and **To date** filter by an inclusive Jakarta-local date range; use the same date in both fields for a single day. **Date order** defaults to **Oldest first**, with **Newest first** available. Sorting also uses the report time for requests on the same day. **Reset** clears both dates and restores oldest-first ordering. Realtime updates preserve these selections.

Date filtering and sorting run on the records already loaded for the authorized user, without additional database queries. Run `bun run test:queue` for date-boundary and sorting tests.

## Rollout and account setup

- `boss` migrates to `approver`; `technician` migrates to `service_agent`. Existing administrator/requester roles are preserved.
- Existing requests are marked `workflow_enabled = false`; their operational status and assignee are preserved. Only new division requests enter Receptionist review. Manual IT issues do not enter reception review.
- In **Account Settings**, configure at least one Admin GA, Atasan GA, optional higher supervisor, and members in enabled GA units.
- Sending for approval or escalating fails with a clear message when no eligible active approver is configured.
- The bell uses each role's pending queue. Inbox/Request navigation badges remain removed. Final approval makes the request appear in the original Approver's ready-to-assign queue. Workflow decisions now emit a transactional PostgreSQL notification, delivered to authorized active browsers via SSE; see [Realtime status](realtime-status.md).

## Verification

Automated checks:

```sh
bun run test:workflow
bun run check
bun run build
```

Authenticated acceptance checklist:

1. Requester submits: only Receptionist/admin can advance intake.
2. Receptionist selects **Assign Directly**: verify the required reason appears, blank/short reasons are rejected, and a valid reason permits assignment to a matching division's Service Agent. Check the saved reason in internal history/audit and verify operational status is unchanged.
3. Separate request: Receptionist sends, Approver approves, then assigns.
4. Separate request: Approver escalates; first-level approval is blocked until Final Approver decides.
5. Final approval returns to the original Approver for assignment.
6. Verify return notes, terminal rejection, cross-division access denial, unassigned status/photo/QR denial, and duplicate-submit rejection.
7. Confirm existing IT/manual issues, client-signature links, and completed historical requests remain unchanged.
8. Check Inbox/Request/bell and action controls at 1366×768 and mobile sizes.

Automated transition tests are not a substitute for this authenticated UI checklist.

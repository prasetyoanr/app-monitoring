# GA request policy

New division requests may only target the active master division with slug `ga`.
The origin comes from the authenticated account. GA cannot submit to itself,
and accounts without a division cannot submit. Renaming the division does not
change its slug or the policy.

`requestDestinationError` is shared by the Request portal, the new-request route,
and `createRequesterTicketAction`. The action validates the database destination,
so a forged destination ID or another division's `isServiceTarget` setting cannot
enable non-GA submissions. Missing or inactive GA fails closed.

The portal links directly to the GA form and explains why submission is unavailable
for GA accounts. History has search and All / Active / Completed / Rejected filters;
legacy tickets use operational status when workflow is disabled.

Existing tickets keep their destination, history and handling permissions. New
requests preserve GA as `receivingDivisionId`; Admin GA or Atasan GA selects an
enabled GA execution unit and an active member. Assignment then updates the
operational service division so IT keeps its existing Inbox controls. Historical
requests without a receiving division remain restricted to their original unit.
Manual IT records remain separate.

Verification: `bunx tsx --test src/lib/request-destination.test.ts src/lib/request-history.test.ts`
and `bun run typecheck`. Browser checks should include GA blocking, a non-GA
requester, direct non-GA URLs, history interactions, 1366x768 and mobile.

import "server-only";

import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/auth/session";
import { masterDivisions, troubleshootingIssues as issues } from "@/db/schema";

// SQL twin of isITDivisionName (src/auth/session.ts); needs master_divisions in the query.
const itServiceDivision = sql`(lower(btrim(${masterDivisions.name})) like 'it%' or lower(btrim(${masterDivisions.name})) like '%information technology%')`;

// `teamIt` is the read-only Team IT view: First / Final Approval additionally see the IT
// team's Troubleshooting records there. It only widens the list the caller asks for; the
// query must join master_divisions on the service division.
export function serviceInboxScope(user: AuthenticatedUser, options: { teamIt?: boolean } = {}) {
  if (user.role === "administrator") return undefined;
  const teamItTroubleshooting = options.teamIt && (user.role === "approver" || user.role === "final_approver")
    ? and(eq(issues.source, "manual"), itServiceDivision)
    : undefined;
  if (user.role === "receptionist") return eq(issues.source, "division_request");
  if (user.role === "final_approver") return or(and(
    eq(issues.source, "division_request"),
    eq(issues.workflowEnabled, true),
    or(eq(issues.workflowStatus, "waiting_final_approver"), eq(issues.finalApproverId, user.id)),
  ), teamItTroubleshooting);
  if (user.role === "approver") return or(and(
    eq(issues.source, "division_request"),
    eq(issues.workflowEnabled, true),
    or(
      and(
        eq(issues.workflowStatus, "waiting_approver"),
        or(isNull(issues.approverId), eq(issues.approverId, user.id)),
      ),
      and(
        inArray(issues.workflowStatus, ["waiting_final_approver", "ready_for_assignment", "assigned", "resolved", "rejected"]),
        eq(issues.approverId, user.id),
      ),
    ),
  ), teamItTroubleshooting);
  if (user.role === "service_agent" && user.divisionId) return and(
    eq(issues.serviceDivisionId, user.divisionId),
    or(
      eq(issues.source, "manual"),
      eq(issues.workflowEnabled, false),
      and(eq(issues.workflowStatus, "assigned"), eq(issues.assignedTechnicianId, user.id)),
    ),
  );
  return sql`false`;
}

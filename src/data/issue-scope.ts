import "server-only";

import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/auth/session";
import { troubleshootingIssues as issues } from "@/db/schema";

export function serviceInboxScope(user: AuthenticatedUser) {
  if (user.role === "administrator") return undefined;
  if (user.role === "receptionist") return eq(issues.source, "division_request");
  if (user.role === "final_approver") return and(
    eq(issues.source, "division_request"),
    eq(issues.workflowEnabled, true),
    or(eq(issues.workflowStatus, "waiting_final_approver"), eq(issues.finalApproverId, user.id)),
  );
  if (user.role === "approver") return and(
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
  );
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

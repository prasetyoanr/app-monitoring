import { sql, type SQL } from "drizzle-orm";
import { troubleshootingIssues as issues } from "@/db/schema";
import { ISSUE_EVENT_CHANNEL } from "@/lib/issue-events";

// Call inside the write transaction: PostgreSQL delivers NOTIFY only on commit.
// The same query can capture the old audience before an assignment changes.
export function issueChangeQuery(issueId: string, channel = ISSUE_EVENT_CHANNEL): SQL {
  return sql`select pg_notify(${channel}, json_build_object(
    'division', ${issues.division},
    'serviceDivisionId', ${issues.serviceDivisionId},
    'source', ${issues.source},
    'workflowEnabled', ${issues.workflowEnabled},
    'workflowStatus', ${issues.workflowStatus},
    'approverId', ${issues.approverId},
    'finalApproverId', ${issues.finalApproverId},
    'assignedTechnicianId', ${issues.assignedTechnicianId}
  )::text) from ${issues} where ${issues.id} = ${issueId}`;
}

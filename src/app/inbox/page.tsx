import type { Metadata } from "next";
import Link from "next/link";
import { isITDivisionName, isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { TicketList } from "@/components/ticket-list";
import { RequestWorkflowQueue } from "@/components/request-workflow-queue";
import { Card } from "@/components/ui";
import { filterStalledTicketRecords, getAssignableServiceAgents, getTicketRecords } from "@/data/app-data";
import { getMasterDataRecords } from "@/data/master-data";
import type { RequestWorkflowStatus } from "@/data/types";

export const metadata: Metadata = { title: "Service Inbox" };

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const dashboardWorkflowFilters = [
  "intake",
  "waiting_approver",
  "waiting_final_approver",
  "ready_for_assignment",
] as const;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [records, currentUser, masterData, serviceAgents] = await Promise.all([
    getTicketRecords({ teamIt: single(params.scope) === "it" }),
    requireAuthenticatedUser(),
    getMasterDataRecords(),
    getAssignableServiceAgents(),
  ]);
  const currentDivision = masterData.divisions.find(
    (division) => division.id === currentUser.divisionId,
  );
  const canManage =
    currentUser.role === "administrator" ||
    currentUser.role === "service_agent";
  const requestedWorkflow = single(params.workflow);
  const workflowFilter = dashboardWorkflowFilters.includes(
    requestedWorkflow as (typeof dashboardWorkflowFilters)[number],
  )
    ? requestedWorkflow as (typeof dashboardWorkflowFilters)[number]
    : "";
  const attentionFilter = single(params.attention) === "stalled" ? "stalled" : "";
  // A filter over the records the viewer already sees; it grants no extra access.
  const isTeamItScope = ["administrator", "approver", "final_approver"].includes(currentUser.role) && single(params.scope) === "it";
  const scopedRecords = isTeamItScope
    ? records.filter((record) => isITDivisionName(record.serviceDivision))
    : records;
  const isAdminFilter = isTeamItScope || (currentUser.role === "administrator" && Boolean(workflowFilter || attentionFilter));
  const visibleRecords = !workflowFilter && !attentionFilter
    ? scopedRecords
    : attentionFilter === "stalled"
      ? filterStalledTicketRecords(scopedRecords)
      : scopedRecords.filter((record) => {
          const statuses: RequestWorkflowStatus[] = workflowFilter === "intake"
            ? ["submitted", "needs_revision"]
            : [workflowFilter as RequestWorkflowStatus];
          return record.workflowEnabled && statuses.includes(record.workflowStatus);
        });
  const filterLabel = isTeamItScope
    ? "Team IT Inbox"
    : attentionFilter === "stalled"
    ? "Requests with no update for more than 3 days"
    : workflowFilter === "intake"
      ? "Admin queue"
      : workflowFilter === "waiting_approver"
        ? "First Approval queue"
        : workflowFilter === "waiting_final_approver"
          ? "Final Approval queue"
          : workflowFilter === "ready_for_assignment"
            ? "Approved requests awaiting assignment"
            : "";

  return (
    <>
      {isAdminFilter ? (
        <Card className="mb-4 flex flex-col gap-3 border-indigo-100 bg-indigo-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold text-indigo-900">{currentUser.role === "administrator" ? "Administrator filter" : "Filter"}</p><p className="mt-1 text-[11px] text-indigo-700">{filterLabel} · {visibleRecords.length} records</p></div>
          <Link href="/inbox" className="inline-flex h-8 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50">Show all</Link>
        </Card>
      ) : null}
      <RequestWorkflowQueue records={visibleRecords} role={currentUser.role} serviceAgents={serviceAgents} />
      {currentUser.role !== "receptionist" ? (
        <TicketList
          initialRecords={visibleRecords}
          canManage={canManage}
          canCreateIssue={
            isITTeamUser(currentUser) &&
            (currentUser.role === "administrator" || currentUser.role === "service_agent")
          }
          useSourceAwareActions={
            isITTeamUser(currentUser) && currentUser.role === "service_agent"
          }
          // The Team IT view lists both kinds of IT records, so the viewer can switch
          // between Troubleshooting and Inbox like the IT staff do.
          showSourceFilter={
            isTeamItScope || (isITTeamUser(currentUser) && currentUser.role === "service_agent")
          }
          showCompletionTime={isITTeamUser(currentUser)}
          showServiceDivisionFilter={currentUser.role === "administrator"}
          viewerProfileKey={
            currentUser.role === "administrator"
              ? "it-service"
              : currentDivision?.inboxProfileKey ?? "basic-service"
          }
          divisionOptions={masterData.divisions.map((item) => item.name)}
          serviceDivisionOptions={masterData.divisions
            .filter((item) => item.isServiceTarget)
            .map((item) => item.name)}
          locationOptions={masterData.locations.map((item) => item.name)}
          categoryOptions={masterData.categories.map((item) => item.name)}
        />
      ) : null}
    </>
  );
}

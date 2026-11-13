import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isITRoleUser, isITTeamUser, requireAuthenticatedUser, requireITTeam } from "@/auth/session";
import { ReportsCenter } from "@/components/reports-center";
import { RoleReportsCenter } from "@/components/role-reports-center";
import { PageHeader } from "@/components/ui";
import { getBackupRecords, getTicketRecords } from "@/data/app-data";
import { listReportGaMembers, reportViewerCapabilities } from "@/data/role-reports";
import { reportSeesAllData } from "@/lib/role-report";
import { getSurveyReportRecords } from "@/data/survey-data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requireAuthenticatedUser();
  if (user.role === "requester") redirect("/");

  // The IT team keeps its own periodic reports (Inbox, Backup User, Survey).
  const isItUser = isITTeamUser(user);
  const hasItReports = isItUser && ["administrator", "service_agent", "approver"].includes(user.role);
  const [{ types }, members] = await Promise.all([reportViewerCapabilities(), listReportGaMembers()]);

  if (!hasItReports) {
    return (
      <>
        {isItUser
          ? <PageHeader eyebrow="IT activity reporting" title="Reports" description="Centralized periodic reporting for IT activities. Select a date range or month, then export the required report." />
          : <PageHeader title="Reports" />}
        <RoleReportsCenter types={types} members={members} canPickGroup={reportSeesAllData(user.role)} theme={isItUser ? "dark" : "ga"} />
      </>
    );
  }

  const currentUser = await requireITTeam();
  const canAccessBackupReport = isITRoleUser(currentUser);
  const canAccessSurveyReport = isITRoleUser(currentUser);
  const [ticketRecords, backupRecords, surveyRecords] = await Promise.all([
    getTicketRecords(),
    canAccessBackupReport ? getBackupRecords() : Promise.resolve([]),
    canAccessSurveyReport ? getSurveyReportRecords() : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="IT activity reporting"
        title="Reports"
        description="Centralized periodic reporting for all IT activities. Select a date range or month, then export the required report."
      />
      <ReportsCenter
        ticketRecords={ticketRecords}
        backupRecords={backupRecords}
        surveyRecords={surveyRecords}
        canAccessBackupReport={canAccessBackupReport}
        canAccessSurveyReport={canAccessSurveyReport}
        hideInboxReport={currentUser.role === "administrator"}
      >
        {reportSeesAllData(currentUser.role) ? (
          <div className="border-t border-slate-200 pt-8">
            <RoleReportsCenter
              types={types}
              members={members}
              canPickGroup
              theme="dark"
              heading={currentUser.role === "administrator" ? "Administrator · all data" : "First Approval · all data"}
            />
          </div>
        ) : null}
      </ReportsCenter>
    </>
  );
}

import type { Metadata } from "next";

import { isITRoleUser, requireITTeam } from "@/auth/session";
import { ReportsCenter } from "@/components/reports-center";
import { PageHeader } from "@/components/ui";
import { getBackupRecords, getTicketRecords } from "@/data/app-data";
import { getSurveyReportRecords } from "@/data/survey-data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
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
      />
    </>
  );
}

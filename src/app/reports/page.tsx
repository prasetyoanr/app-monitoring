import type { Metadata } from "next";

import { requireITTeam } from "@/auth/session";
import { ReportsCenter } from "@/components/reports-center";
import { PageHeader } from "@/components/ui";
import { getBackupRecords, getTicketRecords } from "@/data/app-data";
import { getSurveyReportRecords } from "@/data/survey-data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireITTeam();
  const canAccessBackupReport = true;
  const [ticketRecords, backupRecords, surveyRecords] = await Promise.all([
    getTicketRecords(),
    canAccessBackupReport ? getBackupRecords() : Promise.resolve([]),
    getSurveyReportRecords(),
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
      />
    </>
  );
}

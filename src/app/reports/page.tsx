import type { Metadata } from "next";
import { ReportsCenter } from "@/components/reports-center";
import { PageHeader } from "@/components/ui";
import { getBackupRecords, getTicketRecords } from "@/data/app-data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const [ticketRecords, backupRecords] = await Promise.all([
    getTicketRecords(),
    getBackupRecords(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="IT activity reporting"
        title="Reports"
        description="Centralized periodic reporting for all IT activities. Select a date range or month, then export the required report."
      />
      <ReportsCenter ticketRecords={ticketRecords} backupRecords={backupRecords} />
    </>
  );
}

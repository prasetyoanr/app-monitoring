import type { Metadata } from "next";
import { requireAuthenticatedUser } from "@/auth/session";
import { TicketList } from "@/components/ticket-list";
import { PageHeader } from "@/components/ui";
import { getTicketRecords } from "@/data/app-data";

export const metadata: Metadata = { title: "Troubleshooting" };

export default async function TroubleshootingPage() {
  const [records, currentUser] = await Promise.all([
    getTicketRecords(),
    requireAuthenticatedUser(),
  ]);
  return <><PageHeader eyebrow="Internal IT records" title="Troubleshooting" description="Record every support request from the Head Office and Factory for periodic activity reports to management." /><TicketList initialRecords={records} canManage={currentUser.role === "administrator"} /></>;
}

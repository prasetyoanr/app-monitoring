import type { Metadata } from "next";
import { requireAuthenticatedUser } from "@/auth/session";
import { TicketList } from "@/components/ticket-list";
import { getTicketRecords } from "@/data/app-data";
import { getMasterOptions } from "@/data/master-data";

export const metadata: Metadata = { title: "Troubleshooting" };

export default async function TroubleshootingPage() {
  const [records, currentUser, masterOptions] = await Promise.all([
    getTicketRecords(),
    requireAuthenticatedUser(),
    getMasterOptions(),
  ]);
  return <><TicketList initialRecords={records} canManage={currentUser.role === "administrator"} divisionOptions={masterOptions.divisions} locationOptions={masterOptions.locations} /></>;
}

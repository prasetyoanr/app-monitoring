import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  if (currentUser.role === "requester") redirect("/requests");
  return <><TicketList initialRecords={records} canManage={currentUser.role === "administrator" || currentUser.role === "technician"} divisionOptions={masterOptions.divisions} locationOptions={masterOptions.locations} categoryOptions={masterOptions.categories} /></>;
}

import type { Metadata } from "next";
import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { TicketList } from "@/components/ticket-list";
import { getTicketRecords } from "@/data/app-data";
import { getMasterOptions } from "@/data/master-data";

export const metadata: Metadata = { title: "Service Inbox" };

export default async function InboxPage() {
  const [records, currentUser, masterOptions] = await Promise.all([
    getTicketRecords(),
    requireAuthenticatedUser(),
    getMasterOptions(),
  ]);

  return (
    <TicketList
      initialRecords={records}
      canManage={true}
      canCreateIssue={isITTeamUser(currentUser)}
      divisionOptions={masterOptions.divisions}
      locationOptions={masterOptions.locations}
      categoryOptions={masterOptions.categories}
    />
  );
}

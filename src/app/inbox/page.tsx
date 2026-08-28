import type { Metadata } from "next";
import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { TicketList } from "@/components/ticket-list";
import { getTicketRecords } from "@/data/app-data";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "Service Inbox" };

export default async function InboxPage() {
  const [records, currentUser, masterData] = await Promise.all([
    getTicketRecords(),
    requireAuthenticatedUser(),
    getMasterDataRecords(),
  ]);
  const currentDivision = masterData.divisions.find(
    (division) => division.id === currentUser.divisionId,
  );
  const canManage =
    currentUser.role === "administrator" ||
    (currentUser.role !== "requester" && Boolean(currentUser.divisionId));

  return (
    <TicketList
      initialRecords={records}
      canManage={canManage}
      canCreateIssue={isITTeamUser(currentUser)}
      useSourceAwareActions={
        isITTeamUser(currentUser) && currentUser.role !== "administrator"
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
  );
}

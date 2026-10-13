import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { InternalGaRoom } from "@/components/internal-ga-room";
import { RequestPortal } from "@/components/request-portal";
import { getDivisionRequestRecords } from "@/data/app-data";
import { getInternalGaMembers, getInternalGaRequests } from "@/data/internal-ga";
import { getMasterDataRecords } from "@/data/master-data";
import { canUseInternalGa } from "@/lib/internal-ga";
import { isGaDivisionSlug, requestDestinationError } from "@/lib/request-destination";

export const metadata: Metadata = { title: "Request" };

export default async function RequestsPage() {
  const currentUser = await requireAuthenticatedUser();
  if (currentUser.role === "administrator") redirect("/inbox");

  // GA staff (General Affair and its IT Team) cannot send official requests to GA, so their
  // Request page is the internal room instead.
  if (canUseInternalGa(currentUser)) {
    const [requests, members] = await Promise.all([
      getInternalGaRequests(currentUser.id),
      getInternalGaMembers(),
    ]);
    return (
      <InternalGaRoom
        requests={requests}
        members={members}
        currentUserId={currentUser.id}
        division={currentUser.divisionName}
        theme={isITTeamUser(currentUser) ? "it" : "ga"}
      />
    );
  }

  const [records, masterData] = await Promise.all([
    getDivisionRequestRecords(),
    getMasterDataRecords(),
  ]);
  const gaDivision = masterData.divisions.find((item) => isGaDivisionSlug(item.slug));
  const unavailableReason = requestDestinationError(currentUser.divisionId, gaDivision);

  return (
    <RequestPortal
      initialRecords={records}
      division={masterData.divisions.find((item) => item.id === currentUser.divisionId)?.name ?? null}
      requestHref={!unavailableReason && gaDivision ? `/requests/new/${gaDivision.slug}` : null}
      unavailableReason={unavailableReason}
      theme={isITTeamUser(currentUser) ? "it" : "ga"}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { InternalGaRoom } from "@/components/internal-ga-room";
import { getInternalGaMembers, getInternalGaRequests } from "@/data/internal-ga";
import { canUseInternalGa } from "@/lib/internal-ga";

export const metadata: Metadata = { title: "Internal GA" };

export default async function InternalGaPage() {
  const currentUser = await requireAuthenticatedUser();
  if (!canUseInternalGa(currentUser)) redirect(currentUser.role === "administrator" ? "/inbox" : "/requests");

  const [requests, members] = await Promise.all([
    getInternalGaRequests(currentUser.id),
    getInternalGaMembers(),
  ]);
  return (
    <InternalGaRoom
      mode="history"
      requests={requests}
      members={members}
      currentUserId={currentUser.id}
      division={currentUser.divisionName}
      theme={isITTeamUser(currentUser) ? "it" : "ga"}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { RequestPortal } from "@/components/request-portal";
import { getDivisionRequestRecords } from "@/data/app-data";
import { getMasterDataRecords } from "@/data/master-data";
import { isGaDivisionSlug, requestDestinationError } from "@/lib/request-destination";

export const metadata: Metadata = { title: "Request" };

export default async function RequestsPage() {
  const currentUser = await requireAuthenticatedUser();
  if (currentUser.role === "administrator") redirect("/inbox");

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

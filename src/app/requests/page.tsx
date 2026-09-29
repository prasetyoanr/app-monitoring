import type { Metadata } from "next";

import { requireAuthenticatedUser } from "@/auth/session";
import { RequestPortal } from "@/components/request-portal";
import { getDivisionRequestRecords } from "@/data/app-data";
import { getMasterDataRecords } from "@/data/master-data";
import { GA_DIVISION_SLUG, requestDestinationError } from "@/lib/request-destination";

export const metadata: Metadata = { title: "Request" };

export default async function RequestsPage() {
  const [currentUser, records, masterData] = await Promise.all([
    requireAuthenticatedUser(),
    getDivisionRequestRecords(),
    getMasterDataRecords(),
  ]);
  const gaDivision = masterData.divisions.find((item) => item.slug === GA_DIVISION_SLUG);
  const unavailableReason = requestDestinationError(currentUser.divisionId, gaDivision);

  return (
    <RequestPortal
      initialRecords={records}
      division={masterData.divisions.find((item) => item.id === currentUser.divisionId)?.name ?? null}
      requestHref={!unavailableReason && gaDivision ? `/requests/new/${gaDivision.slug}` : null}
      unavailableReason={unavailableReason}
    />
  );
}

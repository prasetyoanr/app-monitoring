import type { Metadata } from "next";

import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { RequestPortal } from "@/components/request-portal";
import { getDivisionRequestRecords } from "@/data/app-data";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "Request" };

export default async function RequestsPage() {
  const [currentUser, records, masterData] = await Promise.all([
    requireAuthenticatedUser(),
    getDivisionRequestRecords(),
    getMasterDataRecords(),
  ]);

  return (
    <RequestPortal
      initialRecords={records}
      division={masterData.divisions.find((item) => item.id === currentUser.divisionId)?.name ?? null}
      useOrangeRequestButton={!isITTeamUser(currentUser)}
      targetDivisions={masterData.divisions
        .filter((item) => item.isServiceTarget && item.id !== currentUser.divisionId)
        .map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
        }))}
    />
  );
}

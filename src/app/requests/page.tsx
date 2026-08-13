import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/auth/session";
import { RequestPortal } from "@/components/request-portal";
import { getTicketRecords } from "@/data/app-data";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "Permintaan Saya" };

export default async function RequestsPage() {
  const [currentUser, records, masterData] = await Promise.all([
    requireAuthenticatedUser(),
    getTicketRecords(),
    getMasterDataRecords(),
  ]);
  if (currentUser.role !== "requester") redirect("/troubleshooting");
  return (
    <RequestPortal
      initialRecords={records}
      categories={masterData.categories.map((item) => item.name)}
      locations={masterData.locations.map((item) => item.name)}
      division={masterData.divisions.find((item) => item.id === currentUser.divisionId)?.name ?? null}
    />
  );
}

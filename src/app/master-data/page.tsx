import type { Metadata } from "next";

import { requireAdministrator } from "@/auth/session";
import { MasterDataManager } from "@/components/master-data-manager";
import { PageHeader } from "@/components/ui";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "Master Data" };

export default async function MasterDataPage() {
  const [, records] = await Promise.all([
    requireAdministrator(),
    getMasterDataRecords(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Administrator only"
        title="Master Data"
        description="Manage division, location, and service request category options used throughout the application."
      />
      <MasterDataManager initialData={records} />
    </>
  );
}

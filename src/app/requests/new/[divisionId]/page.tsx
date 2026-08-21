import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/auth/session";
import { ServiceRequestForm } from "@/components/service-request-form";
import { PageHeader } from "@/components/ui";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata = { title: "Create Request" };

export default async function NewRequestPage({
  params,
}: {
  params: Promise<{ divisionId: string }>;
}) {
  const [{ divisionId }, currentUser, masterData] = await Promise.all([
    params,
    requireAuthenticatedUser(),
    getMasterDataRecords(),
  ]);
  const targetDivision = masterData.divisions.find(
    (division) =>
      division.id === divisionId &&
      division.isServiceTarget &&
      division.id !== currentUser.divisionId,
  );
  if (!targetDivision) notFound();

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Service Request"
        title={`Request to ${targetDivision.name}`}
        description="Complete the form required by the destination division."
      />
      <ServiceRequestForm
        targetDivision={targetDivision}
        categories={masterData.categories.map((item) => item.name)}
        locations={masterData.locations.map((item) => item.name)}
      />
    </div>
  );
}

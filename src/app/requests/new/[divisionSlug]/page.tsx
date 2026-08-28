import { notFound, redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/auth/session";
import { ServiceRequestForm } from "@/components/service-request-form";
import { PageHeader } from "@/components/ui";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata = { title: "Create Request" };

export default async function NewRequestPage({
  params,
}: {
  params: Promise<{ divisionSlug: string }>;
}) {
  const [{ divisionSlug }, currentUser, masterData] = await Promise.all([
    params,
    requireAuthenticatedUser(),
    getMasterDataRecords(),
  ]);
  const targetDivision = masterData.divisions.find(
    (division) =>
      (division.slug === divisionSlug || division.id === divisionSlug) &&
      division.isServiceTarget &&
      division.id !== currentUser.divisionId,
  );
  if (!targetDivision) notFound();

  if (divisionSlug !== targetDivision.slug) {
    redirect(`/requests/new/${encodeURIComponent(targetDivision.slug)}`);
  }

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

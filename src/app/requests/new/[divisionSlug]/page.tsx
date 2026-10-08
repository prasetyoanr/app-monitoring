import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, ClipboardCheck } from "lucide-react";

import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { ServiceRequestForm } from "@/components/service-request-form";
import { PageHeader } from "@/components/ui";
import { getMasterDataRecords } from "@/data/master-data";
import { requestDestinationError } from "@/lib/request-destination";

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
      (division.slug === divisionSlug || division.id === divisionSlug),
  );
  if (!targetDivision || requestDestinationError(currentUser.divisionId, targetDivision)) notFound();

  if (divisionSlug !== targetDivision.slug) {
    redirect(`/requests/new/${encodeURIComponent(targetDivision.slug)}`);
  }
  const isIt = isITTeamUser(currentUser);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link href="/requests" className={`mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-semibold text-slate-500 transition focus-visible:outline-2 ${isIt ? "hover:text-indigo-700 focus-visible:outline-indigo-600" : "hover:text-emerald-700 focus-visible:outline-emerald-600"}`}><ArrowLeft size={15} /> Back to requests</Link>
      <PageHeader
        eyebrow="General Affairs"
        title="Create a GA request"
        description="Tell us what you need. Clear details help the team review and handle your request."
      />
      <div className={`mb-5 flex flex-col gap-3 rounded-2xl border px-4 ${isIt ? "border-indigo-100 bg-indigo-50/70" : "border-emerald-100 bg-emerald-50/70"} py-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold"><Building2 size={16} className={isIt ? "text-indigo-700" : "text-emerald-700"} /><span className="break-words text-slate-600">{currentUser.divisionName}</span><ArrowRight size={14} className="text-slate-400" /><span className={`rounded-lg bg-white px-3 py-1.5 ring-1 ${isIt ? "text-indigo-900 ring-indigo-100" : "text-emerald-800 ring-emerald-100"}`}>GA</span></div>
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${isIt ? "text-indigo-900" : "text-emerald-800"}`}><ClipboardCheck size={14} /> Reviewed by the Admin</span>
      </div>
      <ServiceRequestForm
        targetDivision={targetDivision}
        categories={masterData.categories.map((item) => item.name)}
        locations={masterData.locations.map((item) => item.name)}
        theme={isIt ? "it" : "ga"}
      />
    </div>
  );
}

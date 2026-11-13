import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isITRoleUser, requireAuthenticatedUser } from "@/auth/session";
import { KpiWorkspace } from "@/components/kpi-workspace";
import { getKpiMembers, validKpiYear } from "@/data/kpi-workspace";
import { getKpiSurveyOptions } from "@/data/kpi-survey";

export const metadata: Metadata = { title: "KPI" };

export default async function KpiPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireAuthenticatedUser();
  if (user.role === "requester") redirect("/");
  const requested = Number((await searchParams).year);
  const year = validKpiYear(requested) ? requested : Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date()));
  const [members, surveyOptions] = await Promise.all([getKpiMembers(user, year), isITRoleUser(user) ? getKpiSurveyOptions() : Promise.resolve([])]);
  const surveyVersion = JSON.stringify(members.flatMap((member) => member.items.filter((item) => item.source === "survey.satisfaction").map((item) => [member.id, item.id, item.computedActuals, item.surveyEvidence])));
  return <KpiWorkspace key={`${year}:${surveyVersion}`} initialMembers={members} surveyOptions={surveyOptions} currentUserId={user.id} isAdministrator={user.role === "administrator"} year={year} />;
}

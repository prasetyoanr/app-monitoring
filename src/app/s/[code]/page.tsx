import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientSurveyForm } from "@/components/client-survey-form";
import { getDivisionOptions } from "@/data/master-data";
import { getPublicSurveyByCode } from "@/data/survey-data";

export const metadata: Metadata = {
  title: "General Affairs Management System Survey",
  robots: { index: false, follow: false },
};

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [survey, divisions] = await Promise.all([
    getPublicSurveyByCode(code),
    getDivisionOptions(),
  ]);
  if (!survey) notFound();
  return <ClientSurveyForm survey={survey} code={code} divisions={divisions} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SurveyBuilder } from "@/components/survey-builder";
import { getEditableSurvey } from "@/data/survey-data";

export const metadata: Metadata = { title: "Edit Survey" };

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const survey = await getEditableSurvey(id);
  if (!survey) notFound();

  return <SurveyBuilder initialSurvey={survey} />;
}

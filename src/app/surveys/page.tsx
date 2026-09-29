import type { Metadata } from "next";

import { requireITRoleUser } from "@/auth/session";
import { SurveyCenter } from "@/components/survey-center";
import { getSurveyListRecords } from "@/data/survey-data";

export const metadata: Metadata = { title: "Surveys" };

export default async function SurveysPage() {
  await requireITRoleUser();
  const surveys = await getSurveyListRecords();
  return (
    <SurveyCenter
      surveys={surveys}
      canManage={true}
    />
  );
}

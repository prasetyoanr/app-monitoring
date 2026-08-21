import type { Metadata } from "next";

import { requireITTeam } from "@/auth/session";
import { SurveyCenter } from "@/components/survey-center";
import { getSurveyListRecords } from "@/data/survey-data";

export const metadata: Metadata = { title: "Surveys" };

export default async function SurveysPage() {
  await requireITTeam();
  const surveys = await getSurveyListRecords();
  return (
    <SurveyCenter
      surveys={surveys}
      canManage={true}
    />
  );
}

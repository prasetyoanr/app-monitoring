import type { Metadata } from "next";

import { requireAuthenticatedUser } from "@/auth/session";
import { SurveyCenter } from "@/components/survey-center";
import { getSurveyListRecords } from "@/data/survey-data";

export const metadata: Metadata = { title: "Client Surveys" };

export default async function SurveysPage() {
  const [surveys, currentUser] = await Promise.all([
    getSurveyListRecords(),
    requireAuthenticatedUser(),
  ]);
  return (
    <SurveyCenter
      surveys={surveys}
      canManage={currentUser.role === "administrator"}
    />
  );
}

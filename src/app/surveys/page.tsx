import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/auth/session";
import { SurveyCenter } from "@/components/survey-center";
import { getSurveyListRecords } from "@/data/survey-data";

export const metadata: Metadata = { title: "Client Surveys" };

export default async function SurveysPage() {
  const currentUser = await requireAuthenticatedUser();
  if (currentUser.role === "requester") redirect("/requests");
  const surveys = await getSurveyListRecords();
  return (
    <SurveyCenter
      surveys={surveys}
      canManage={currentUser.role === "administrator"}
    />
  );
}

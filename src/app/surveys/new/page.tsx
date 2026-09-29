import type { Metadata } from "next";

import { requireITRoleUser } from "@/auth/session";
import { SurveyBuilder } from "@/components/survey-builder";

export const metadata: Metadata = { title: "Create Survey" };

export default async function NewSurveyPage() {
  await requireITRoleUser();
  return <SurveyBuilder />;
}

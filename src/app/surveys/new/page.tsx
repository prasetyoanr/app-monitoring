import type { Metadata } from "next";

import { requireAdministrator } from "@/auth/session";
import { SurveyBuilder } from "@/components/survey-builder";

export const metadata: Metadata = { title: "Create Survey" };

export default async function NewSurveyPage() {
  await requireAdministrator();
  return <SurveyBuilder />;
}

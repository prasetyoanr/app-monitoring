import "server-only";

import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";

import { db } from "@/db";
import { surveyAnswers, surveyForms, surveyQuestions, surveySubmissions } from "@/db/schema";
import type { KpiSurveyRating } from "@/lib/kpi-survey";

export type KpiSurveyOption = { id: string; title: string };

export async function getKpiSurveyOptions(): Promise<KpiSurveyOption[]> {
  return db.selectDistinct({ id: surveyForms.id, title: surveyForms.title }).from(surveyForms)
    .innerJoin(surveyQuestions, eq(surveyQuestions.surveyId, surveyForms.id))
    .where(and(eq(surveyQuestions.type, "linear_scale"), isNotNull(surveyQuestions.kpiCategory)))
    .orderBy(surveyForms.title);
}

export async function getKpiSurveyRatings(year: number, surveyIds: string[]): Promise<KpiSurveyRating[]> {
  if (!surveyIds.length) return [];
  const start = new Date(`${year}-01-01T00:00:00+07:00`);
  const end = new Date(`${year + 1}-01-01T00:00:00+07:00`);
  const rows = await db.select({
    surveyId: surveySubmissions.surveyId,
    submissionId: surveySubmissions.id,
    submittedAt: surveySubmissions.submittedAt,
    value: surveyAnswers.value,
  }).from(surveyAnswers)
    .innerJoin(surveySubmissions, eq(surveyAnswers.submissionId, surveySubmissions.id))
    .innerJoin(surveyQuestions, and(eq(surveyAnswers.questionId, surveyQuestions.id), eq(surveyQuestions.surveyId, surveySubmissions.surveyId)))
    .where(and(inArray(surveySubmissions.surveyId, surveyIds), gte(surveySubmissions.submittedAt, start), lt(surveySubmissions.submittedAt, end), eq(surveyQuestions.type, "linear_scale"), isNotNull(surveyQuestions.kpiCategory)));
  const monthFormat = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", month: "numeric" });
  return rows.map((row) => ({ surveyId: row.surveyId, submissionId: row.submissionId, month: Number(monthFormat.format(row.submittedAt)), value: row.value }));
}

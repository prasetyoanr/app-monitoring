import "server-only";

import { asc, desc, eq, inArray, sql } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import {
  surveyAnswers,
  surveyForms,
  surveyQuestions,
  surveySubmissions,
} from "@/db/schema";
import type {
  PublicSurveyRecord,
  SurveyDisplayStatus,
  SurveyListRecord,
  SurveyReportRecord,
  SurveyResponseData,
  SurveyStatus,
} from "@/data/survey-types";
import { jakartaDateInput } from "@/lib/jakarta-date";

const displayDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

function displayStatus(
  status: SurveyStatus,
  expiresAt: Date | null,
): SurveyDisplayStatus {
  return status === "active" && expiresAt && expiresAt <= new Date()
    ? "expired"
    : status;
}

export async function getSurveyListRecords(): Promise<SurveyListRecord[]> {
  await requireAuthenticatedUser();
  const rows = await db
    .select({
      id: surveyForms.id,
      title: surveyForms.title,
      description: surveyForms.description,
      status: surveyForms.status,
      publicCode: surveyForms.publicCode,
      expiresAt: surveyForms.expiresAt,
      createdAt: surveyForms.createdAt,
      questionCount: sql<number>`(select count(*)::int from ${surveyQuestions} where ${surveyQuestions.surveyId} = ${surveyForms.id})`,
      responseCount: sql<number>`(select count(*)::int from ${surveySubmissions} where ${surveySubmissions.surveyId} = ${surveyForms.id})`,
    })
    .from(surveyForms)
    .orderBy(desc(surveyForms.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: displayStatus(row.status, row.expiresAt),
    storedStatus: row.status,
    publicCode: row.publicCode,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: displayDateTime.format(row.createdAt),
    questionCount: row.questionCount,
    responseCount: row.responseCount,
  }));
}

export async function getPublicSurveyByCode(
  code: string,
): Promise<PublicSurveyRecord | null> {
  if (!/^[A-Za-z0-9_-]{16}$/.test(code)) return null;
  const [survey] = await db
    .select({
      id: surveyForms.id,
      title: surveyForms.title,
      description: surveyForms.description,
      status: surveyForms.status,
      expiresAt: surveyForms.expiresAt,
    })
    .from(surveyForms)
    .where(eq(surveyForms.publicCode, code))
    .limit(1);
  if (!survey) return null;

  const questions = await db
    .select({
      id: surveyQuestions.id,
      position: surveyQuestions.position,
      type: surveyQuestions.type,
      title: surveyQuestions.title,
      isRequired: surveyQuestions.isRequired,
      options: surveyQuestions.options,
    })
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, survey.id))
    .orderBy(asc(surveyQuestions.position));

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    status: displayStatus(survey.status, survey.expiresAt),
    expiresAt: survey.expiresAt?.toISOString() ?? null,
    questions,
  };
}

export async function getSurveyResponseData(
  surveyId: string,
): Promise<SurveyResponseData | null> {
  await requireAuthenticatedUser();
  const [survey] = await db
    .select({ id: surveyForms.id, title: surveyForms.title })
    .from(surveyForms)
    .where(eq(surveyForms.id, surveyId))
    .limit(1);
  if (!survey) return null;

  const [questions, submissions] = await Promise.all([
    db
      .select({
        id: surveyQuestions.id,
        position: surveyQuestions.position,
        type: surveyQuestions.type,
        title: surveyQuestions.title,
        isRequired: surveyQuestions.isRequired,
        options: surveyQuestions.options,
      })
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(asc(surveyQuestions.position)),
    db
      .select({
        id: surveySubmissions.id,
        clientName: surveySubmissions.clientName,
        division: surveySubmissions.division,
        submittedAt: surveySubmissions.submittedAt,
      })
      .from(surveySubmissions)
      .where(eq(surveySubmissions.surveyId, surveyId))
      .orderBy(desc(surveySubmissions.submittedAt)),
  ]);

  const answers = submissions.length
    ? await db
        .select({
          submissionId: surveyAnswers.submissionId,
          questionId: surveyAnswers.questionId,
          value: surveyAnswers.value,
        })
        .from(surveyAnswers)
        .where(
          inArray(
            surveyAnswers.submissionId,
            submissions.map((submission) => submission.id),
          ),
        )
    : [];
  const answersBySubmission = new Map<
    string,
    SurveyResponseData["submissions"][number]["answers"]
  >();
  for (const answer of answers) {
    const values = answersBySubmission.get(answer.submissionId) ?? [];
    values.push({ questionId: answer.questionId, value: answer.value });
    answersBySubmission.set(answer.submissionId, values);
  }

  return {
    surveyId: survey.id,
    title: survey.title,
    questions,
    submissions: submissions.map((submission) => ({
      id: submission.id,
      clientName: submission.clientName ?? "Anonymous",
      division: submission.division ?? "Not provided",
      submittedAt: displayDateTime.format(submission.submittedAt),
      answers: answersBySubmission.get(submission.id) ?? [],
    })),
  };
}

export async function getSurveyReportRecords(): Promise<SurveyReportRecord[]> {
  await requireAuthenticatedUser();
  const submissions = await db
    .select({
      surveyId: surveyForms.id,
      surveyTitle: surveyForms.title,
      responseId: surveySubmissions.id,
      clientName: surveySubmissions.clientName,
      division: surveySubmissions.division,
      submittedAt: surveySubmissions.submittedAt,
    })
    .from(surveySubmissions)
    .innerJoin(surveyForms, eq(surveySubmissions.surveyId, surveyForms.id))
    .orderBy(desc(surveySubmissions.submittedAt));

  const answers = submissions.length
    ? await db
        .select({
          submissionId: surveyAnswers.submissionId,
          questionTitle: surveyQuestions.title,
          questionType: surveyQuestions.type,
          questionPosition: surveyQuestions.position,
          value: surveyAnswers.value,
        })
        .from(surveyAnswers)
        .innerJoin(
          surveyQuestions,
          eq(surveyAnswers.questionId, surveyQuestions.id),
        )
        .where(
          inArray(
            surveyAnswers.submissionId,
            submissions.map((submission) => submission.responseId),
          ),
        )
        .orderBy(asc(surveyQuestions.position))
    : [];
  const answersBySubmission = new Map<
    string,
    SurveyReportRecord["answers"]
  >();
  for (const answer of answers) {
    const values = answersBySubmission.get(answer.submissionId) ?? [];
    values.push({
      questionTitle: answer.questionTitle,
      questionType: answer.questionType,
      value: answer.value,
    });
    answersBySubmission.set(answer.submissionId, values);
  }

  return submissions.map((submission) => ({
    surveyId: submission.surveyId,
    surveyTitle: submission.surveyTitle,
    responseId: submission.responseId,
    clientName: submission.clientName ?? "Anonymous",
    division: submission.division ?? "Not provided",
    submittedAt: displayDateTime.format(submission.submittedAt),
    submittedDate: jakartaDateInput(submission.submittedAt),
    answers: answersBySubmission.get(submission.responseId) ?? [],
  }));
}

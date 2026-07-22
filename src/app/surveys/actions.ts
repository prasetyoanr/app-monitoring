"use server";

import { randomBytes } from "node:crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import {
  analyzeSurveySubmission,
  GEMINI_SENTIMENT_MODEL,
} from "@/ai/gemini-survey-analysis";
import { requireAdministrator, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import {
  auditLogs,
  surveyAnswerAnalyses,
  surveyAnswers,
  surveyForms,
  surveyQuestions,
  surveySubmissions,
} from "@/db/schema";
import { getSurveyResponseData } from "@/data/survey-data";
import type {
  SurveyAnswerValue,
  SurveyKpiCategory,
  SurveyQuestionInput,
  SurveyQuestionRecord,
  SurveyResponseData,
  SurveyStatus,
} from "@/data/survey-types";
import type { ActionResult } from "@/data/types";

const choiceTypes = new Set(["multiple_choice", "checkboxes", "dropdown"]);
const kpiCategories = new Set<SurveyKpiCategory>(["installation", "repair"]);

function validUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function cleanText(value: string, maxLength: number, required = true) {
  const result = value.trim();
  if ((required && !result) || result.length > maxLength) {
    throw new Error("Survey information is incomplete or too long.");
  }
  return result;
}

function validateQuestions(questions: SurveyQuestionInput[]) {
  if (questions.length < 1 || questions.length > 50) {
    throw new Error("A survey must contain 1 to 50 questions.");
  }
  return questions.map((question, position) => {
    const title = cleanText(question.title, 500);
    const options = question.options
      .map((option) => option.trim())
      .filter(Boolean)
      .filter((option, index, values) => values.indexOf(option) === index);
    if (choiceTypes.has(question.type) && options.length < 2) {
      throw new Error(`Question ${position + 1} requires at least two options.`);
    }
    if (options.some((option) => option.length > 200) || options.length > 30) {
      throw new Error(`Question ${position + 1} contains invalid options.`);
    }
    const kpiCategory = question.kpiCategory ?? null;
    if (
      kpiCategory !== null &&
      (question.type !== "linear_scale" || !kpiCategories.has(kpiCategory))
    ) {
      throw new Error(`Question ${position + 1} contains an invalid KPI category.`);
    }
    return {
      position,
      type: question.type,
      kpiCategory,
      title,
      isRequired: question.isRequired,
      options: choiceTypes.has(question.type) ? options : [],
    };
  });
}

function parseExpiry(value: string) {
  if (!value) return null;
  const expiresAt = new Date(`${value}:00+07:00`);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new Error("Survey expiration must be in the future.");
  }
  return expiresAt;
}

function revalidateSurveys() {
  revalidatePath("/");
  revalidatePath("/surveys");
  revalidatePath("/reports");
}

export async function createSurveyAction(input: {
  title: string;
  description: string;
  expiresAt: string;
  status: "draft" | "active";
  questions: SurveyQuestionInput[];
}): Promise<ActionResult<{ id: string; publicCode: string }>> {
  const currentUser = await requireAdministrator();
  try {
    const title = cleanText(input.title, 200);
    const description = cleanText(input.description, 5_000, false);
    const questions = validateQuestions(input.questions);
    const expiresAt = parseExpiry(input.expiresAt);
    const publicCode = randomBytes(12).toString("base64url");

    const id = await db.transaction(async (tx) => {
      const [survey] = await tx
        .insert(surveyForms)
        .values({
          title,
          description,
          status: input.status,
          publicCode,
          expiresAt,
          createdByTechnicianId: currentUser.id,
        })
        .returning({ id: surveyForms.id });
      await tx.insert(surveyQuestions).values(
        questions.map((question) => ({ surveyId: survey.id, ...question })),
      );
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: `survey.${input.status === "active" ? "published" : "created"}`,
        entityType: "survey",
        entityId: survey.id,
        metadata: { questionCount: questions.length },
      });
      return survey.id;
    });
    revalidateSurveys();
    return { ok: true, data: { id, publicCode } };
  } catch (error) {
    console.error("Unable to create survey.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create survey.",
    };
  }
}

export async function analyzeSurveyResponsesAction(
  surveyId: string,
): Promise<ActionResult<{ queuedResponses: number }>> {
  const currentUser = await requireAdministrator();
  try {
    if (!validUuid(surveyId)) throw new Error("Invalid survey ID.");
    if (!process.env.GEMINI_API_KEY?.trim()) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const answers = await db
      .select({
        answerId: surveyAnswers.id,
        submissionId: surveySubmissions.id,
      })
      .from(surveyAnswers)
      .innerJoin(
        surveySubmissions,
        eq(surveyAnswers.submissionId, surveySubmissions.id),
      )
      .innerJoin(
        surveyQuestions,
        eq(surveyAnswers.questionId, surveyQuestions.id),
      )
      .where(
        and(
          eq(surveySubmissions.surveyId, surveyId),
          ne(surveyQuestions.type, "linear_scale"),
        ),
      );
    if (!answers.length) {
      throw new Error("This survey has no text or choice answers to analyze.");
    }
    const now = new Date();
    await db
      .insert(surveyAnswerAnalyses)
      .values(
        answers.map((answer) => ({
          answerId: answer.answerId,
          model: GEMINI_SENTIMENT_MODEL,
        })),
      )
      .onConflictDoUpdate({
        target: surveyAnswerAnalyses.answerId,
        set: {
          status: "pending",
          model: GEMINI_SENTIMENT_MODEL,
          sentimentLabel: null,
          sentimentScore: null,
          confidencePercent: null,
          summary: null,
          errorMessage: null,
          analyzedAt: null,
          updatedAt: now,
        },
      });
    const submissionIds = [...new Set(answers.map((answer) => answer.submissionId))];
    after(async () => {
      for (const submissionId of submissionIds) {
        await analyzeSurveySubmission(submissionId);
      }
    });
    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: "survey.ai_analysis_queued",
      entityType: "survey",
      entityId: surveyId,
      metadata: { provider: "gemini", responseCount: submissionIds.length },
    });
    revalidateSurveys();
    return { ok: true, data: { queuedResponses: submissionIds.length } };
  } catch (error) {
    console.error("Unable to queue Gemini survey analysis.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to analyze survey responses.",
    };
  }
}

export async function setSurveyStatusAction(
  id: string,
  status: Extract<SurveyStatus, "active" | "closed">,
): Promise<ActionResult> {
  const currentUser = await requireAdministrator();
  try {
    if (!validUuid(id)) throw new Error("Invalid survey ID.");
    if (status === "active") {
      const [{ total }] = await db
        .select({ total: count() })
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, id));
      if (!total) throw new Error("A survey needs at least one question.");
      const [survey] = await db
        .select({ expiresAt: surveyForms.expiresAt })
        .from(surveyForms)
        .where(eq(surveyForms.id, id))
        .limit(1);
      if (!survey || (survey.expiresAt && survey.expiresAt <= new Date())) {
        throw new Error("Expired surveys cannot be published again.");
      }
    }
    const [updated] = await db
      .update(surveyForms)
      .set({ status, updatedAt: new Date() })
      .where(eq(surveyForms.id, id))
      .returning({ id: surveyForms.id });
    if (!updated) throw new Error("Survey was not found.");
    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: `survey.${status === "active" ? "published" : "closed"}`,
      entityType: "survey",
      entityId: id,
    });
    revalidateSurveys();
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to update survey status.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update survey.",
    };
  }
}

export async function duplicateSurveyAction(
  id: string,
): Promise<ActionResult<{ id: string; publicCode: string; title: string }>> {
  const currentUser = await requireAdministrator();
  try {
    if (!validUuid(id)) throw new Error("Invalid survey ID.");
    const publicCode = randomBytes(12).toString("base64url");
    const duplicated = await db.transaction(async (tx) => {
      const [source] = await tx
        .select({
          title: surveyForms.title,
          description: surveyForms.description,
        })
        .from(surveyForms)
        .where(eq(surveyForms.id, id))
        .limit(1);
      if (!source) throw new Error("Survey not found.");

      const questions = await tx
        .select({
          position: surveyQuestions.position,
          type: surveyQuestions.type,
          kpiCategory: surveyQuestions.kpiCategory,
          title: surveyQuestions.title,
          isRequired: surveyQuestions.isRequired,
          options: surveyQuestions.options,
        })
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, id));
      if (!questions.length) {
        throw new Error("A survey needs at least one question before it can be duplicated.");
      }

      const title = `${source.title.slice(0, 193).trimEnd()} (Copy)`;
      const [survey] = await tx
        .insert(surveyForms)
        .values({
          title,
          description: source.description,
          status: "draft",
          publicCode,
          expiresAt: null,
          createdByTechnicianId: currentUser.id,
        })
        .returning({ id: surveyForms.id });
      await tx.insert(surveyQuestions).values(
        questions.map((question) => ({ surveyId: survey.id, ...question })),
      );
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "survey.duplicated",
        entityType: "survey",
        entityId: survey.id,
        metadata: { sourceSurveyId: id, questionCount: questions.length },
      });
      return { id: survey.id, publicCode, title };
    });
    revalidateSurveys();
    return { ok: true, data: duplicated };
  } catch (error) {
    console.error("Unable to duplicate survey.", error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to duplicate survey.",
    };
  }
}

export async function deleteSurveyAction(id: string): Promise<ActionResult> {
  const currentUser = await requireAdministrator();
  try {
    if (!validUuid(id)) throw new Error("Invalid survey ID.");
    await db.transaction(async (tx) => {
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "survey.deleted",
        entityType: "survey",
        entityId: id,
      });
      const [deleted] = await tx
        .delete(surveyForms)
        .where(eq(surveyForms.id, id))
        .returning({ id: surveyForms.id });
      if (!deleted) throw new Error("Survey was not found.");
    });
    revalidateSurveys();
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to delete survey.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete survey.",
    };
  }
}

export async function getSurveyResponsesAction(
  surveyId: string,
): Promise<ActionResult<SurveyResponseData>> {
  await requireAuthenticatedUser();
  try {
    if (!validUuid(surveyId)) throw new Error("Invalid survey ID.");
    const data = await getSurveyResponseData(surveyId);
    if (!data) throw new Error("Survey was not found.");
    return { ok: true, data };
  } catch (error) {
    console.error("Unable to load survey responses.", error);
    return { ok: false, error: "Unable to load survey responses." };
  }
}

function normalizedAnswer(
  question: SurveyQuestionRecord,
  value: SurveyAnswerValue | undefined,
): SurveyAnswerValue | null {
  if (question.type === "checkboxes") {
    if (!Array.isArray(value)) return null;
    const selected = value.filter(
      (item): item is string =>
        typeof item === "string" && question.options.includes(item),
    );
    return selected.length ? [...new Set(selected)] : null;
  }
  if (question.type === "linear_scale") {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
      ? value
      : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 5_000) return null;
  if (choiceTypes.has(question.type) && !question.options.includes(text)) {
    return null;
  }
  return text;
}

export async function submitSurveyAction(input: {
  code: string;
  clientName: string;
  division: string;
  answers: Array<{ questionId: string; value: SurveyAnswerValue }>;
}): Promise<ActionResult<{ submissionId: string }>> {
  try {
    if (!/^[A-Za-z0-9_-]{16}$/.test(input.code)) {
      throw new Error("Survey link is invalid.");
    }
    const clientName = cleanText(input.clientName, 120, false) || null;
    const division = cleanText(input.division, 120, false) || null;
    if (input.answers.length > 50) throw new Error("Too many answers.");
    const submittedAt = new Date();

    const { submissionId, analyzableAnswerCount } = await db.transaction(async (tx) => {
      const [survey] = await tx
        .select({
          id: surveyForms.id,
          status: surveyForms.status,
          expiresAt: surveyForms.expiresAt,
        })
        .from(surveyForms)
        .where(eq(surveyForms.publicCode, input.code))
        .limit(1);
      if (
        !survey ||
        survey.status !== "active" ||
        (survey.expiresAt && survey.expiresAt <= submittedAt)
      ) {
        throw new Error("This survey is closed or has expired.");
      }
      const questions = await tx
        .select({
          id: surveyQuestions.id,
          position: surveyQuestions.position,
          type: surveyQuestions.type,
          kpiCategory: surveyQuestions.kpiCategory,
          title: surveyQuestions.title,
          isRequired: surveyQuestions.isRequired,
          options: surveyQuestions.options,
        })
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, survey.id));
      const inputAnswers = new Map(
        input.answers.map((answer) => [answer.questionId, answer.value]),
      );
      const answers = questions.flatMap((question) => {
        const value = normalizedAnswer(question, inputAnswers.get(question.id));
        if (question.isRequired && value === null) {
          throw new Error(`Please answer: ${question.title}`);
        }
        return value === null ? [] : [{ questionId: question.id, value }];
      });

      const [submission] = await tx
        .insert(surveySubmissions)
        .values({ surveyId: survey.id, clientName, division, submittedAt })
        .returning({ id: surveySubmissions.id });
      let analyzableAnswerCount = 0;
      if (answers.length) {
        const insertedAnswers = await tx.insert(surveyAnswers).values(
          answers.map((answer) => ({
            submissionId: submission.id,
            questionId: answer.questionId,
            value: answer.value,
          })),
        ).returning({
          id: surveyAnswers.id,
          questionId: surveyAnswers.questionId,
        });
        const analyzableQuestionIds = new Set(
          questions
            .filter((question) => question.type !== "linear_scale")
            .map((question) => question.id),
        );
        const analyzableAnswers = insertedAnswers.filter((answer) =>
          analyzableQuestionIds.has(answer.questionId),
        );
        analyzableAnswerCount = analyzableAnswers.length;
        if (analyzableAnswers.length) {
          await tx.insert(surveyAnswerAnalyses).values(
            analyzableAnswers.map((answer) => ({
              answerId: answer.id,
              model: GEMINI_SENTIMENT_MODEL,
            })),
          );
        }
      }
      await tx.insert(auditLogs).values({
        actorType: "client",
        actorId: clientName,
        action: "survey.response_submitted",
        entityType: "survey",
        entityId: survey.id,
        metadata: { submissionId: submission.id, division },
      });
      return { submissionId: submission.id, analyzableAnswerCount };
    });
    if (analyzableAnswerCount) {
      after(() => analyzeSurveySubmission(submissionId));
    }
    revalidateSurveys();
    return { ok: true, data: { submissionId } };
  } catch (error) {
    console.error("Unable to submit survey response.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to submit survey.",
    };
  }
}

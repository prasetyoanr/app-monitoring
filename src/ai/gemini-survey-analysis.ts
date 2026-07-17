import "server-only";

import { GoogleGenAI } from "@google/genai";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  surveyAnswerAnalyses,
  surveyAnswers,
  surveyQuestions,
} from "@/db/schema";

export const GEMINI_SENTIMENT_MODEL =
  process.env.GEMINI_SENTIMENT_MODEL?.trim() || "gemini-3.5-flash";

const sentimentLabels = [
  "very_positive",
  "positive",
  "neutral",
  "negative",
  "very_negative",
  "not_applicable",
] as const;

const responseSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          answer_id: { type: "string" },
          label: { type: "string", enum: [...sentimentLabels] },
          score: { type: ["integer", "null"], minimum: 1, maximum: 5 },
          confidence_percent: { type: "integer", minimum: 0, maximum: 100 },
          summary: { type: "string" },
        },
        required: [
          "answer_id",
          "label",
          "score",
          "confidence_percent",
          "summary",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

const analysisResultSchema = z.object({
  results: z
    .array(
      z.object({
        answer_id: z.uuid(),
        label: z.enum(sentimentLabels),
        score: z.number().int().min(1).max(5).nullable(),
        confidence_percent: z.number().int().min(0).max(100),
        summary: z.string().trim().max(500),
      }),
    )
    .max(50),
});

export interface GeminiSurveyItem {
  answerId: string;
  question: string;
  answer: string;
}

export async function analyzeSurveyItems(items: GeminiSurveyItem[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  if (!items.length) return [];

  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: GEMINI_SENTIMENT_MODEL,
    store: false,
    system_instruction: `
You analyze questionnaire answers about IT team service performance.
Analyze every item independently and preserve its answer_id exactly.

Scoring:
5 = very positive
4 = positive
3 = neutral or mixed
2 = negative
1 = very negative

Use label not_applicable and score null when an answer does not evaluate IT
service, is only factual or identity information, is empty, or cannot be
reasonably interpreted as feedback. Do not invent context. A positive answer
may receive a score even when it does not contain a numeric rating. Keep each
summary factual, concise, and in the language used by the client.
    `.trim(),
    input: JSON.stringify({ answers: items }),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: responseSchema,
    },
  });
  if (!interaction.output_text) {
    throw new Error("Gemini returned an empty analysis.");
  }
  const parsed = analysisResultSchema.parse(
    JSON.parse(interaction.output_text),
  );
  const allowedIds = new Set(items.map((item) => item.answerId));
  const seenIds = new Set<string>();
  return parsed.results.filter((result) => {
    if (!allowedIds.has(result.answer_id) || seenIds.has(result.answer_id)) {
      return false;
    }
    seenIds.add(result.answer_id);
    return true;
  });
}

function answerText(value: string | string[] | number) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export async function prepareSurveyAnalyses(submissionId: string) {
  const answers = await db
    .select({ id: surveyAnswers.id })
    .from(surveyAnswers)
    .innerJoin(
      surveyQuestions,
      eq(surveyAnswers.questionId, surveyQuestions.id),
    )
    .where(
      and(
        eq(surveyAnswers.submissionId, submissionId),
        ne(surveyQuestions.type, "linear_scale"),
      ),
    );
  if (!answers.length) return 0;
  await db
    .insert(surveyAnswerAnalyses)
    .values(
      answers.map((answer) => ({
        answerId: answer.id,
        model: GEMINI_SENTIMENT_MODEL,
      })),
    )
    .onConflictDoNothing();
  return answers.length;
}

export async function analyzeSurveySubmission(submissionId: string) {
  await prepareSurveyAnalyses(submissionId);
  const pending = await db
    .select({
      answerId: surveyAnswers.id,
      question: surveyQuestions.title,
      value: surveyAnswers.value,
    })
    .from(surveyAnswers)
    .innerJoin(
      surveyQuestions,
      eq(surveyAnswers.questionId, surveyQuestions.id),
    )
    .innerJoin(
      surveyAnswerAnalyses,
      eq(surveyAnswerAnalyses.answerId, surveyAnswers.id),
    )
    .where(
      and(
        eq(surveyAnswers.submissionId, submissionId),
        eq(surveyAnswerAnalyses.status, "pending"),
      ),
    );
  if (!pending.length) return;

  const answerIds = pending.map((answer) => answer.answerId);
  try {
    const results = await analyzeSurveyItems(
      pending.map((answer) => ({
        answerId: answer.answerId,
        question: answer.question,
        answer: answerText(answer.value),
      })),
    );
    const resultById = new Map(
      results.map((result) => [result.answer_id, result]),
    );
    const now = new Date();
    await db.transaction(async (tx) => {
      for (const answerId of answerIds) {
        const result = resultById.get(answerId);
        await tx
          .update(surveyAnswerAnalyses)
          .set(
            result
              ? {
                  status: "completed",
                  model: GEMINI_SENTIMENT_MODEL,
                  sentimentLabel: result.label,
                  sentimentScore: result.score,
                  confidencePercent: result.confidence_percent,
                  summary: result.summary,
                  errorMessage: null,
                  analyzedAt: now,
                  updatedAt: now,
                }
              : {
                  status: "failed",
                  errorMessage: "Gemini did not return this answer.",
                  updatedAt: now,
                },
          )
          .where(eq(surveyAnswerAnalyses.answerId, answerId));
      }
    });
  } catch (error) {
    console.error(
      "Gemini survey analysis failed.",
      error instanceof Error ? error.message : "Unknown Gemini error.",
    );
    await db
      .update(surveyAnswerAnalyses)
      .set({
        status: "failed",
        errorMessage: "Gemini analysis could not be completed.",
        updatedAt: new Date(),
      })
      .where(inArray(surveyAnswerAnalyses.answerId, answerIds));
  }
}

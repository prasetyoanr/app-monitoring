CREATE TYPE "survey_analysis_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "survey_sentiment_label" AS ENUM('very_positive', 'positive', 'neutral', 'negative', 'very_negative', 'not_applicable');--> statement-breakpoint
CREATE TABLE "survey_answer_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"answer_id" uuid NOT NULL,
	"status" "survey_analysis_status" DEFAULT 'pending'::"survey_analysis_status" NOT NULL,
	"provider" varchar(32) DEFAULT 'gemini' NOT NULL,
	"model" varchar(120) NOT NULL,
	"sentiment_label" "survey_sentiment_label",
	"sentiment_score" integer,
	"confidence_percent" integer,
	"summary" varchar(500),
	"error_message" varchar(500),
	"manual_score" integer,
	"analyzed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_answer_analyses_score_check" CHECK ("sentiment_score" is null or "sentiment_score" between 1 and 5),
	CONSTRAINT "survey_answer_analyses_confidence_check" CHECK ("confidence_percent" is null or "confidence_percent" between 0 and 100),
	CONSTRAINT "survey_answer_analyses_manual_score_check" CHECK ("manual_score" is null or "manual_score" between 1 and 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answer_analyses_answer_unique" ON "survey_answer_analyses" ("answer_id");--> statement-breakpoint
CREATE INDEX "survey_answer_analyses_status_idx" ON "survey_answer_analyses" ("status");--> statement-breakpoint
ALTER TABLE "survey_answer_analyses" ADD CONSTRAINT "survey_answer_analyses_answer_id_survey_answers_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "survey_answers"("id") ON DELETE CASCADE;
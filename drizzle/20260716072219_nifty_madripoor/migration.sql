CREATE TYPE "survey_form_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "survey_question_type" AS ENUM('short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown', 'linear_scale');--> statement-breakpoint
CREATE TABLE "survey_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "survey_form_status" DEFAULT 'draft'::"survey_form_status" NOT NULL,
	"public_code" varchar(16) NOT NULL,
	"created_by_technician_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_forms_public_code_format_check" CHECK ("public_code" ~ '^[A-Za-z0-9_-]{16}$')
);
--> statement-breakpoint
CREATE TABLE "survey_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"survey_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"type" "survey_question_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_questions_position_check" CHECK ("position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "survey_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"survey_id" uuid NOT NULL,
	"client_name" varchar(120),
	"division" varchar(120),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answers_submission_question_unique" ON "survey_answers" ("submission_id","question_id");--> statement-breakpoint
CREATE INDEX "survey_answers_question_idx" ON "survey_answers" ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_forms_public_code_unique" ON "survey_forms" ("public_code");--> statement-breakpoint
CREATE INDEX "survey_forms_status_created_idx" ON "survey_forms" ("status","created_at");--> statement-breakpoint
CREATE INDEX "survey_questions_survey_position_idx" ON "survey_questions" ("survey_id","position");--> statement-breakpoint
CREATE INDEX "survey_submissions_survey_submitted_idx" ON "survey_submissions" ("survey_id","submitted_at");--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_submission_id_survey_submissions_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "survey_submissions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_question_id_survey_questions_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "survey_forms" ADD CONSTRAINT "survey_forms_created_by_technician_id_technicians_id_fkey" FOREIGN KEY ("created_by_technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_id_survey_forms_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey_forms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "survey_submissions" ADD CONSTRAINT "survey_submissions_survey_id_survey_forms_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey_forms"("id") ON DELETE CASCADE;--> statement-breakpoint
INSERT INTO "survey_forms" ("id", "title", "description", "status", "public_code")
VALUES (
	'00000000-0000-4000-8000-000000000201',
	'Imported IT Service Survey',
	'Historical client satisfaction responses imported from the previous survey feature.',
	'closed',
	'legacySurvey2026'
)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "survey_questions" ("id", "survey_id", "position", "type", "title", "is_required", "options")
VALUES
	('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000201', 0, 'linear_scale', 'Overall satisfaction', true, '[]'::jsonb),
	('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000201', 1, 'paragraph', 'Comments', false, '[]'::jsonb),
	('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000201', 2, 'short_answer', 'Troubleshooting reference', false, '[]'::jsonb)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "survey_submissions" ("id", "survey_id", "client_name", "division", "submitted_at")
SELECT "id", '00000000-0000-4000-8000-000000000201', "client_name", "department", "responded_at"
FROM "survey_responses"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "survey_answers" ("submission_id", "question_id", "value")
SELECT "id", '00000000-0000-4000-8000-000000000202', to_jsonb("score")
FROM "survey_responses"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "survey_answers" ("submission_id", "question_id", "value")
SELECT "id", '00000000-0000-4000-8000-000000000203', to_jsonb("comment")
FROM "survey_responses"
WHERE length(trim("comment")) > 0
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "survey_answers" ("submission_id", "question_id", "value")
SELECT "id", '00000000-0000-4000-8000-000000000204', to_jsonb("issue_reference")
FROM "survey_responses"
WHERE length(trim("issue_reference")) > 0
ON CONFLICT DO NOTHING;

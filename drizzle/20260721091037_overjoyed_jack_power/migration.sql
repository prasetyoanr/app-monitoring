CREATE TYPE "survey_kpi_category" AS ENUM('installation', 'repair');--> statement-breakpoint
ALTER TABLE "survey_questions" ADD COLUMN "kpi_category" "survey_kpi_category";
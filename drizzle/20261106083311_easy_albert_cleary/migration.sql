CREATE TABLE "kpi_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"scorecard_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"bytes" bytea NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"scorecard_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"actor_id" uuid,
	"action" varchar(20) NOT NULL,
	"note" text,
	"items_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"review_note" text,
	"reviewed_by_id" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_scorecards_year_check" CHECK ("year" BETWEEN 2020 AND 2100),
	CONSTRAINT "kpi_scorecards_status_check" CHECK ("status" IN ('draft', 'submitted', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX "kpi_files_scorecard_idx" ON "kpi_files" ("scorecard_id");--> statement-breakpoint
CREATE INDEX "kpi_review_events_scorecard_idx" ON "kpi_review_events" ("scorecard_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_scorecards_owner_year_unique" ON "kpi_scorecards" ("owner_id","year");--> statement-breakpoint
ALTER TABLE "kpi_files" ADD CONSTRAINT "kpi_files_scorecard_id_kpi_scorecards_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "kpi_scorecards"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kpi_review_events" ADD CONSTRAINT "kpi_review_events_scorecard_id_kpi_scorecards_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "kpi_scorecards"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kpi_review_events" ADD CONSTRAINT "kpi_review_events_actor_id_technicians_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "kpi_scorecards" ADD CONSTRAINT "kpi_scorecards_owner_id_technicians_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kpi_scorecards" ADD CONSTRAINT "kpi_scorecards_reviewed_by_id_technicians_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
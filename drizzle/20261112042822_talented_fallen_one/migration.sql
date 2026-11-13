CREATE TABLE "kpi_downtime_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"scorecard_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"hours" double precision NOT NULL,
	"source" varchar(16) DEFAULT 'manual' NOT NULL,
	"updated_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_downtime_weeks_hours_check" CHECK ("hours" >= 0 AND "hours" <= 168),
	CONSTRAINT "kpi_downtime_weeks_source_check" CHECK ("source" IN ('manual', 'monitoring'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_downtime_weeks_unique" ON "kpi_downtime_weeks" ("scorecard_id","item_id","week_start");--> statement-breakpoint
ALTER TABLE "kpi_downtime_weeks" ADD CONSTRAINT "kpi_downtime_weeks_scorecard_id_kpi_scorecards_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "kpi_scorecards"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kpi_downtime_weeks" ADD CONSTRAINT "kpi_downtime_weeks_updated_by_id_technicians_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
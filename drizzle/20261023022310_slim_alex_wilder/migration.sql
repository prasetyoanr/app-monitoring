CREATE TABLE "ga_spreadsheet_report_viewers" (
	"report_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"granted_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ga_spreadsheet_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"url" text NOT NULL,
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ga_spreadsheet_report_viewers_unique" ON "ga_spreadsheet_report_viewers" ("report_id","viewer_id");--> statement-breakpoint
CREATE INDEX "ga_spreadsheet_report_viewers_viewer_idx" ON "ga_spreadsheet_report_viewers" ("viewer_id");--> statement-breakpoint
CREATE INDEX "ga_spreadsheet_reports_owner_idx" ON "ga_spreadsheet_reports" ("owner_id","updated_at");--> statement-breakpoint
ALTER TABLE "ga_spreadsheet_report_viewers" ADD CONSTRAINT "ga_spreadsheet_report_viewers_Q5ogqBVhGLrN_fkey" FOREIGN KEY ("report_id") REFERENCES "ga_spreadsheet_reports"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ga_spreadsheet_report_viewers" ADD CONSTRAINT "ga_spreadsheet_report_viewers_viewer_id_technicians_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ga_spreadsheet_report_viewers" ADD CONSTRAINT "ga_spreadsheet_report_viewers_granted_by_id_technicians_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ga_spreadsheet_reports" ADD CONSTRAINT "ga_spreadsheet_reports_owner_id_technicians_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "technicians"("id") ON DELETE CASCADE;
--> statement-breakpoint
INSERT INTO "ga_spreadsheet_reports" ("owner_id", "title", "url", "description", "created_at", "updated_at")
SELECT t."id", COALESCE(NULLIF(BTRIM(t."spreadsheet_title"), ''), 'Spreadsheet Report'),
  t."spreadsheet_url", t."spreadsheet_description",
  COALESCE(t."spreadsheet_updated_at", t."updated_at", now()),
  COALESCE(t."spreadsheet_updated_at", t."updated_at", now())
FROM "technicians" t
WHERE t."spreadsheet_url" IS NOT NULL AND BTRIM(t."spreadsheet_url") <> ''
  AND NOT EXISTS (SELECT 1 FROM "ga_spreadsheet_reports" r WHERE r."owner_id" = t."id");
--> statement-breakpoint
INSERT INTO "ga_spreadsheet_report_viewers" ("report_id", "viewer_id", "granted_by_id", "created_at")
SELECT r."id", v."viewer_id", v."granted_by_id", v."created_at"
FROM "ga_spreadsheet_viewers" v
JOIN "ga_spreadsheet_reports" r ON r."owner_id" = v."owner_id"
ON CONFLICT ("report_id", "viewer_id") DO NOTHING;

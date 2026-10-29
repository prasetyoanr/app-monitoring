CREATE TABLE "ga_spreadsheet_viewers" (
	"owner_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"granted_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ga_spreadsheet_viewers_distinct_check" CHECK ("owner_id" <> "viewer_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ga_spreadsheet_viewers_owner_viewer_unique" ON "ga_spreadsheet_viewers" ("owner_id","viewer_id");--> statement-breakpoint
CREATE INDEX "ga_spreadsheet_viewers_viewer_idx" ON "ga_spreadsheet_viewers" ("viewer_id");--> statement-breakpoint
ALTER TABLE "ga_spreadsheet_viewers" ADD CONSTRAINT "ga_spreadsheet_viewers_owner_id_technicians_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ga_spreadsheet_viewers" ADD CONSTRAINT "ga_spreadsheet_viewers_viewer_id_technicians_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ga_spreadsheet_viewers" ADD CONSTRAINT "ga_spreadsheet_viewers_granted_by_id_technicians_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
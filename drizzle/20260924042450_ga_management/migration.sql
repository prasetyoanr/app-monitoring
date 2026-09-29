ALTER TABLE "master_divisions" ADD COLUMN "is_ga_unit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "receiving_division_id" uuid;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_u1XFPGtif6J0_fkey" FOREIGN KEY ("receiving_division_id") REFERENCES "master_divisions"("id") ON DELETE RESTRICT;
-- Only the established GA and IT units are opted in automatically.
--> statement-breakpoint
UPDATE "master_divisions" SET "is_ga_unit" = true WHERE "slug" IN ('ga', 'it', 'it-team') OR "name" = 'IT Team';
--> statement-breakpoint
UPDATE "troubleshooting_issues" AS issue SET "receiving_division_id" = division."id"
FROM "master_divisions" AS division
WHERE issue."service_division_id" = division."id" AND division."slug" = 'ga'
AND issue."source" = 'division_request' AND issue."workflow_enabled" = true;

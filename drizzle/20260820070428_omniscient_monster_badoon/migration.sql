ALTER TABLE "master_divisions" ADD COLUMN "is_service_target" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "master_divisions" ADD COLUMN "request_form_key" varchar(80);--> statement-breakpoint
UPDATE "master_divisions"
SET
  "is_service_target" = true,
  "request_form_key" = CASE
    WHEN lower("name") = 'it team' THEN 'it-support'
    WHEN lower("name") = 'purchase' THEN 'purchase-request'
    ELSE "request_form_key"
  END
WHERE lower("name") IN ('it team', 'purchase');--> statement-breakpoint
INSERT INTO "master_divisions" ("name", "is_service_target")
SELECT DISTINCT issue."service_division", true
FROM "troubleshooting_issues" AS issue
WHERE NOT EXISTS (
  SELECT 1
  FROM "master_divisions" AS division
  WHERE lower(division."name") = lower(issue."service_division")
);--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "service_division_id" uuid;--> statement-breakpoint
UPDATE "troubleshooting_issues" AS issue
SET "service_division_id" = division."id"
FROM "master_divisions" AS division
WHERE lower(division."name") = lower(issue."service_division");--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ALTER COLUMN "service_division_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_service_division_id_idx" ON "troubleshooting_issues" ("service_division_id");--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_Rnvx2fU0eOOP_fkey" FOREIGN KEY ("service_division_id") REFERENCES "master_divisions"("id") ON DELETE RESTRICT;

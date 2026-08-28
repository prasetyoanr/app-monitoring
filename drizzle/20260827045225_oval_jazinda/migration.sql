CREATE TYPE "issue_source" AS ENUM('manual', 'division_request');--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "source" "issue_source" DEFAULT 'manual'::"issue_source" NOT NULL;--> statement-breakpoint
UPDATE "troubleshooting_issues"
SET "source" = 'division_request'::"issue_source"
WHERE "requester_id" IS NOT NULL;

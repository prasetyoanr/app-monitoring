ALTER TABLE "troubleshooting_issues" ADD COLUMN "workflow_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "troubleshooting_issues" AS issue
SET "workflow_enabled" = true
WHERE EXISTS (SELECT 1 FROM "request_workflow_history" AS history WHERE history."issue_id" = issue."id");--> statement-breakpoint
UPDATE "troubleshooting_issues"
SET "workflow_status" = 'assigned'::"request_workflow_status"
WHERE "workflow_enabled" = false;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ALTER COLUMN "workflow_enabled" SET DEFAULT true;

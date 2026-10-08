CREATE TABLE "workflow_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"recipient_id" uuid NOT NULL,
	"issue_id" varchar(32) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"note" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "workflow_notifications_recipient_unread_idx" ON "workflow_notifications" ("recipient_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "workflow_notifications_issue_idx" ON "workflow_notifications" ("issue_id");--> statement-breakpoint
ALTER TABLE "workflow_notifications" ADD CONSTRAINT "workflow_notifications_recipient_id_technicians_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workflow_notifications" ADD CONSTRAINT "workflow_notifications_issue_id_troubleshooting_issues_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "troubleshooting_issues"("id") ON DELETE CASCADE;
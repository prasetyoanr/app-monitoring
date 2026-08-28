CREATE TABLE "request_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"issue_id" varchar(32) NOT NULL,
	"changed_by_id" uuid,
	"previous_status" "issue_status" NOT NULL,
	"status" "issue_status" NOT NULL,
	"reason" text,
	"requester_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_status_notifications" ADD COLUMN "requester_note" text;--> statement-breakpoint
CREATE INDEX "request_status_history_issue_idx" ON "request_status_history" ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "request_status_history_actor_idx" ON "request_status_history" ("changed_by_id");--> statement-breakpoint
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_issue_id_troubleshooting_issues_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "troubleshooting_issues"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changed_by_id_technicians_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
CREATE TABLE "request_status_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"recipient_id" uuid NOT NULL,
	"issue_id" varchar(32) NOT NULL,
	"status" "issue_status" NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "request_status_notifications_recipient_idx" ON "request_status_notifications" ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "request_status_notifications_unread_idx" ON "request_status_notifications" ("recipient_id","read_at");--> statement-breakpoint
CREATE INDEX "request_status_notifications_issue_idx" ON "request_status_notifications" ("issue_id");--> statement-breakpoint
ALTER TABLE "request_status_notifications" ADD CONSTRAINT "request_status_notifications_recipient_id_technicians_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "request_status_notifications" ADD CONSTRAINT "request_status_notifications_Iqttpnufq7QN_fkey" FOREIGN KEY ("issue_id") REFERENCES "troubleshooting_issues"("id") ON DELETE CASCADE;
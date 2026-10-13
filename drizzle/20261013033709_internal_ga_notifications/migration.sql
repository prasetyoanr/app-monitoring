CREATE TABLE "ga_internal_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"recipient_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_id" uuid,
	"kind" varchar(40) NOT NULL,
	"note" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ga_internal_notifications_recipient_unread_idx" ON "ga_internal_notifications" ("recipient_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "ga_internal_notifications_request_idx" ON "ga_internal_notifications" ("request_id");--> statement-breakpoint
ALTER TABLE "ga_internal_notifications" ADD CONSTRAINT "ga_internal_notifications_recipient_id_technicians_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ga_internal_notifications" ADD CONSTRAINT "ga_internal_notifications_sGZpW6KQYEON_fkey" FOREIGN KEY ("request_id") REFERENCES "ga_internal_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ga_internal_notifications" ADD CONSTRAINT "ga_internal_notifications_actor_id_technicians_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
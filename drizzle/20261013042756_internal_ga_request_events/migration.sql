CREATE TABLE "ga_internal_request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL,
	"kind" varchar(40) NOT NULL,
	"actor_id" uuid,
	"actor_name" varchar(120) NOT NULL,
	"previous_status" "ga_internal_status",
	"status" "ga_internal_status",
	"subject_name" varchar(120),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ga_internal_request_events_request_idx" ON "ga_internal_request_events" ("request_id","created_at");--> statement-breakpoint
ALTER TABLE "ga_internal_request_events" ADD CONSTRAINT "ga_internal_request_events_k8hKtYg5izbi_fkey" FOREIGN KEY ("request_id") REFERENCES "ga_internal_requests"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ga_internal_request_events" ADD CONSTRAINT "ga_internal_request_events_actor_id_technicians_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
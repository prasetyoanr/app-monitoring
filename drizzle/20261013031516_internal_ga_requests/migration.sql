CREATE TYPE "ga_internal_status" AS ENUM('open', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "ga_internal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"location" varchar(160),
	"status" "ga_internal_status" DEFAULT 'open'::"ga_internal_status" NOT NULL,
	"created_by_id" uuid,
	"assigned_to_id" uuid,
	"resolution_note" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ga_internal_requests_status_idx" ON "ga_internal_requests" ("status","created_at");--> statement-breakpoint
CREATE INDEX "ga_internal_requests_creator_idx" ON "ga_internal_requests" ("created_by_id");--> statement-breakpoint
CREATE INDEX "ga_internal_requests_assignee_idx" ON "ga_internal_requests" ("assigned_to_id");--> statement-breakpoint
ALTER TABLE "ga_internal_requests" ADD CONSTRAINT "ga_internal_requests_created_by_id_technicians_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ga_internal_requests" ADD CONSTRAINT "ga_internal_requests_assigned_to_id_technicians_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint

-- Legal and Purchase are plain requesters from now on: they no longer receive GA assignments
-- and Purchase no longer has its own request form. GA always accepts requests.
UPDATE "master_divisions" SET "is_ga_unit" = false WHERE "slug" = 'legal';--> statement-breakpoint
UPDATE "master_divisions" SET "is_service_target" = false, "request_form_key" = NULL WHERE "slug" = 'purchase';--> statement-breakpoint
UPDATE "master_divisions" SET "is_service_target" = true WHERE "slug" IN ('ga', 'general-affair', 'general-affairs');

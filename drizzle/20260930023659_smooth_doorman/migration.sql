CREATE TYPE "ga_work_plan_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "ga_work_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"member_id" uuid NOT NULL,
	"division_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"target_date" date NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "ga_work_plan_status" DEFAULT 'planned'::"ga_work_plan_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ga_work_plan_items_target_week_check" CHECK ("target_date" >= "week_start" and "target_date" < "week_start" + 7)
);
--> statement-breakpoint
CREATE INDEX "ga_work_plan_items_member_week_idx" ON "ga_work_plan_items" ("member_id","week_start");--> statement-breakpoint
CREATE INDEX "ga_work_plan_items_division_week_idx" ON "ga_work_plan_items" ("division_id","week_start");--> statement-breakpoint
ALTER TABLE "ga_work_plan_items" ADD CONSTRAINT "ga_work_plan_items_member_id_technicians_id_fkey" FOREIGN KEY ("member_id") REFERENCES "technicians"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "ga_work_plan_items" ADD CONSTRAINT "ga_work_plan_items_division_id_master_divisions_id_fkey" FOREIGN KEY ("division_id") REFERENCES "master_divisions"("id") ON DELETE RESTRICT;
CREATE TYPE "request_workflow_action" AS ENUM('submitted', 'routed_directly', 'sent_for_approval', 'approved', 'escalated', 'final_approved', 'returned', 'rejected', 'assigned');--> statement-breakpoint
CREATE TYPE "request_workflow_status" AS ENUM('submitted', 'waiting_approver', 'waiting_final_approver', 'ready_for_assignment', 'assigned', 'needs_revision', 'rejected');--> statement-breakpoint
ALTER TYPE "technician_role" RENAME TO "account_role";--> statement-breakpoint
CREATE TABLE "request_workflow_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"issue_id" varchar(32) NOT NULL,
	"actor_id" uuid,
	"action" "request_workflow_action" NOT NULL,
	"previous_status" "request_workflow_status",
	"status" "request_workflow_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "workflow_status" "request_workflow_status" DEFAULT 'submitted'::"request_workflow_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "approval_required" boolean;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "reviewed_by_id" uuid;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "approver_id" uuid;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "final_approver_id" uuid;--> statement-breakpoint
UPDATE "troubleshooting_issues"
SET
	"workflow_status" = CASE
		WHEN "source" = 'division_request' AND "assigned_technician_id" IS NULL
			THEN 'ready_for_assignment'::"request_workflow_status"
		ELSE 'assigned'::"request_workflow_status"
	END,
	"approval_required" = false;--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
UPDATE "technicians"
SET "role" = CASE
	WHEN "role" = 'boss' THEN 'approver'
	WHEN "role" = 'technician' THEN 'service_agent'
	ELSE "role"
END;--> statement-breakpoint
DROP TYPE "account_role";--> statement-breakpoint
CREATE TYPE "account_role" AS ENUM('administrator', 'receptionist', 'approver', 'final_approver', 'service_agent', 'requester');--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" SET DATA TYPE "account_role" USING "role"::"account_role";--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" SET DEFAULT 'requester'::"account_role";--> statement-breakpoint
CREATE INDEX "request_workflow_history_issue_idx" ON "request_workflow_history" ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "request_workflow_history_actor_idx" ON "request_workflow_history" ("actor_id");--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_workflow_idx" ON "troubleshooting_issues" ("workflow_status");--> statement-breakpoint
ALTER TABLE "request_workflow_history" ADD CONSTRAINT "request_workflow_history_xCefN5WCHCTW_fkey" FOREIGN KEY ("issue_id") REFERENCES "troubleshooting_issues"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "request_workflow_history" ADD CONSTRAINT "request_workflow_history_actor_id_technicians_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_reviewed_by_id_technicians_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_approver_id_technicians_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_final_approver_id_technicians_id_fkey" FOREIGN KEY ("final_approver_id") REFERENCES "technicians"("id") ON DELETE SET NULL;

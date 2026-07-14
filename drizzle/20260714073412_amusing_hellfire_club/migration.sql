CREATE TYPE "approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "audit_actor_type" AS ENUM('technician', 'client', 'system');--> statement-breakpoint
CREATE TYPE "backup_status" AS ENUM('Success', 'Failed', 'Overdue', 'Pending');--> statement-breakpoint
CREATE TYPE "issue_priority" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TYPE "issue_status" AS ENUM('New', 'In Progress', 'Waiting for Client Approval', 'Completed', 'Reopened');--> statement-breakpoint
CREATE TYPE "technician_role" AS ENUM('technician', 'administrator');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" varchar(120),
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(120) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_users" (
	"id" varchar(32) PRIMARY KEY,
	"full_name" varchar(120) NOT NULL,
	"username" varchar(120),
	"email" varchar(254),
	"password_ciphertext" bytea,
	"password_iv" bytea,
	"password_key_version" integer,
	"sync_path" text NOT NULL,
	"last_backup_at" timestamp with time zone,
	"status" "backup_status" DEFAULT 'Pending'::"backup_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "backup_users_password_encryption_check" CHECK (("password_ciphertext" is null and "password_iv" is null and "password_key_version" is null) or ("password_ciphertext" is not null and "password_iv" is not null and "password_key_version" is not null))
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"role" "technician_role" DEFAULT 'technician'::"technician_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "troubleshooting_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"issue_id" varchar(32) NOT NULL,
	"requested_by_technician_id" uuid,
	"token_hash" varchar(64) NOT NULL,
	"status" "approval_status" DEFAULT 'pending'::"approval_status" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"client_name" varchar(120),
	"client_note" text,
	"signature_data" bytea,
	"signature_mime_type" varchar(80),
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "troubleshooting_approvals_token_hash_format_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "troubleshooting_approvals_expiry_check" CHECK ("expires_at" > "requested_at"),
	CONSTRAINT "troubleshooting_approvals_signature_pair_check" CHECK (("signature_data" is null and "signature_mime_type" is null) or ("signature_data" is not null and "signature_mime_type" is not null)),
	CONSTRAINT "troubleshooting_approvals_decision_check" CHECK (("status" <> 'approved' or ("client_name" is not null and "signature_data" is not null and "responded_at" is not null)) and ("status" <> 'rejected' or ("client_name" is not null and "responded_at" is not null)))
);
--> statement-breakpoint
CREATE TABLE "troubleshooting_issues" (
	"id" varchar(32) PRIMARY KEY,
	"title" varchar(200) NOT NULL,
	"category" varchar(80) NOT NULL,
	"requester_name" varchar(120) NOT NULL,
	"requester_email" varchar(254),
	"division" varchar(120) NOT NULL,
	"location" varchar(160) NOT NULL,
	"reported_at" timestamp with time zone NOT NULL,
	"priority" "issue_priority" NOT NULL,
	"status" "issue_status" DEFAULT 'New'::"issue_status" NOT NULL,
	"completed_days" integer,
	"description" text NOT NULL,
	"resolution" text DEFAULT '' NOT NULL,
	"assigned_technician_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "troubleshooting_issues_completed_days_check" CHECK ("completed_days" is null or "completed_days" >= 0)
);
--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "backup_users_status_idx" ON "backup_users" ("status");--> statement-breakpoint
CREATE INDEX "backup_users_last_backup_at_idx" ON "backup_users" ("last_backup_at");--> statement-breakpoint
CREATE UNIQUE INDEX "technicians_email_unique" ON "technicians" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "troubleshooting_approvals_token_hash_unique" ON "troubleshooting_approvals" ("token_hash");--> statement-breakpoint
CREATE INDEX "troubleshooting_approvals_issue_idx" ON "troubleshooting_approvals" ("issue_id");--> statement-breakpoint
CREATE INDEX "troubleshooting_approvals_status_expiry_idx" ON "troubleshooting_approvals" ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "troubleshooting_approvals_one_pending_per_issue_unique" ON "troubleshooting_approvals" ("issue_id") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_status_idx" ON "troubleshooting_issues" ("status");--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_reported_at_idx" ON "troubleshooting_issues" ("reported_at");--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_assignee_idx" ON "troubleshooting_issues" ("assigned_technician_id");--> statement-breakpoint
ALTER TABLE "troubleshooting_approvals" ADD CONSTRAINT "troubleshooting_approvals_1D6ChWVRDzDh_fkey" FOREIGN KEY ("issue_id") REFERENCES "troubleshooting_issues"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "troubleshooting_approvals" ADD CONSTRAINT "troubleshooting_approvals_x15JsPA8bHRf_fkey" FOREIGN KEY ("requested_by_technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_zPMOafikuU2f_fkey" FOREIGN KEY ("assigned_technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
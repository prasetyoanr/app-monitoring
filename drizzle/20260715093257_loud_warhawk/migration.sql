CREATE TYPE "backup_invitation_status" AS ENUM('pending', 'submitted', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "backup_user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"token_hash" varchar(64) NOT NULL,
	"status" "backup_invitation_status" DEFAULT 'pending'::"backup_invitation_status" NOT NULL,
	"created_by_technician_id" uuid,
	"backup_user_id" varchar(32),
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "backup_user_invitations_token_hash_format_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "backup_user_invitations_expiry_check" CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint
ALTER TABLE "backup_users" ADD COLUMN "division" varchar(120) DEFAULT 'Unassigned' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "backup_user_invitations_token_hash_unique" ON "backup_user_invitations" ("token_hash");--> statement-breakpoint
CREATE INDEX "backup_user_invitations_status_expiry_idx" ON "backup_user_invitations" ("status","expires_at");--> statement-breakpoint
CREATE INDEX "backup_user_invitations_backup_user_idx" ON "backup_user_invitations" ("backup_user_id");--> statement-breakpoint
ALTER TABLE "backup_user_invitations" ADD CONSTRAINT "backup_user_invitations_KIYhttCQmtMT_fkey" FOREIGN KEY ("created_by_technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "backup_user_invitations" ADD CONSTRAINT "backup_user_invitations_backup_user_id_backup_users_id_fkey" FOREIGN KEY ("backup_user_id") REFERENCES "backup_users"("id") ON DELETE SET NULL;
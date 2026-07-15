CREATE TABLE "auth_sessions" (
	"token_hash" varchar(64) PRIMARY KEY,
	"technician_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_format_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "auth_sessions_expiry_check" CHECK ("expires_at" > "created_at")
);
--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "username" varchar(80);--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "auth_sessions_technician_idx" ON "auth_sessions" ("technician_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "technicians_username_unique" ON "technicians" ("username");--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_technician_id_technicians_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_failed_login_attempts_check" CHECK ("failed_login_attempts" >= 0);
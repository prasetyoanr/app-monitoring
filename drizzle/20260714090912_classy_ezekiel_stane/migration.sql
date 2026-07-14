ALTER TABLE "backup_users" DROP CONSTRAINT "backup_users_password_encryption_check";--> statement-breakpoint
ALTER TABLE "backup_users" ADD COLUMN "password_information" text;--> statement-breakpoint
ALTER TABLE "backup_users" DROP COLUMN "password_ciphertext";--> statement-breakpoint
ALTER TABLE "backup_users" DROP COLUMN "password_iv";--> statement-breakpoint
ALTER TABLE "backup_users" DROP COLUMN "password_key_version";
ALTER TABLE "master_divisions" ADD COLUMN "inbox_profile_key" varchar(80) DEFAULT 'basic-service' NOT NULL;--> statement-breakpoint
UPDATE "master_divisions"
SET "inbox_profile_key" = 'it-service'
WHERE "slug" = 'it-team';

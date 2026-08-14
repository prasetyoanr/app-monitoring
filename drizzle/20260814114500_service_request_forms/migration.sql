INSERT INTO "master_divisions" ("name") VALUES ('IT Team') ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "service_division" varchar(120) NOT NULL DEFAULT 'IT Team';--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "request_form_key" varchar(80) NOT NULL DEFAULT 'it-support';--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "request_data" jsonb NOT NULL DEFAULT '{}'::jsonb;--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_service_division_idx" ON "troubleshooting_issues" ("service_division");

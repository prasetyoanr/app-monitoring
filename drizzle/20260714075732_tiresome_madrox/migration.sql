CREATE TYPE "asset_status" AS ENUM('Active', 'Under Repair', 'Inactive');--> statement-breakpoint
CREATE TYPE "server_status" AS ENUM('Healthy', 'Warning', 'Critical');--> statement-breakpoint
CREATE TABLE "it_assets" (
	"code" varchar(40) PRIMARY KEY,
	"name" varchar(180) NOT NULL,
	"type" varchar(80) NOT NULL,
	"assigned_to" varchar(120) NOT NULL,
	"department" varchar(120) NOT NULL,
	"status" "asset_status" DEFAULT 'Active'::"asset_status" NOT NULL,
	"health_percent" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "it_assets_health_check" CHECK ("health_percent" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "monitored_servers" (
	"name" varchar(120) PRIMARY KEY,
	"role" varchar(160) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"status" "server_status" DEFAULT 'Healthy'::"server_status" NOT NULL,
	"cpu_percent" integer NOT NULL,
	"memory_percent" integer NOT NULL,
	"disk_percent" integer NOT NULL,
	"uptime_days" integer DEFAULT 0 NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitored_servers_usage_check" CHECK ("cpu_percent" between 0 and 100 and "memory_percent" between 0 and 100 and "disk_percent" between 0 and 100),
	CONSTRAINT "monitored_servers_uptime_check" CHECK ("uptime_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"issue_reference" varchar(32) NOT NULL,
	"client_name" varchar(120) NOT NULL,
	"department" varchar(120) NOT NULL,
	"score" integer NOT NULL,
	"comment" text NOT NULL,
	"responded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_responses_score_check" CHECK ("score" between 1 and 5)
);
--> statement-breakpoint
CREATE INDEX "it_assets_status_idx" ON "it_assets" ("status");--> statement-breakpoint
CREATE INDEX "it_assets_department_idx" ON "it_assets" ("department");--> statement-breakpoint
CREATE UNIQUE INDEX "monitored_servers_ip_unique" ON "monitored_servers" ("ip_address");--> statement-breakpoint
CREATE INDEX "monitored_servers_status_idx" ON "monitored_servers" ("status");--> statement-breakpoint
CREATE INDEX "survey_responses_responded_at_idx" ON "survey_responses" ("responded_at");--> statement-breakpoint
CREATE INDEX "survey_responses_issue_idx" ON "survey_responses" ("issue_reference");
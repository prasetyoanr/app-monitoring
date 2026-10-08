ALTER TABLE "technicians" ADD COLUMN "spreadsheet_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "spreadsheet_title" varchar(160);--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "spreadsheet_url" text;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "spreadsheet_description" varchar(500);--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "spreadsheet_updated_at" timestamp with time zone;
ALTER TABLE "troubleshooting_issues" ADD COLUMN "requester_photo_data" bytea;--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "requester_photo_mime_type" varchar(40);--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "requester_photo_file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_requester_photo_pair_check" CHECK (("requester_photo_data" is null and "requester_photo_mime_type" is null and "requester_photo_file_name" is null) or ("requester_photo_data" is not null and "requester_photo_mime_type" is not null and "requester_photo_file_name" is not null));--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_requester_photo_size_check" CHECK ("requester_photo_data" is null or octet_length("requester_photo_data") <= 2097152);

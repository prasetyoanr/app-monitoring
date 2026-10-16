CREATE TYPE "service_lane" AS ENUM('asset', 'atk_rtk');--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "service_lane" "service_lane";--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "service_lane" "service_lane";
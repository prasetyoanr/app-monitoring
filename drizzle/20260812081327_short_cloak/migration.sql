ALTER TYPE "technician_role" ADD VALUE 'requester';--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD COLUMN "requester_id" uuid;--> statement-breakpoint
CREATE INDEX "troubleshooting_issues_requester_idx" ON "troubleshooting_issues" ("requester_id");--> statement-breakpoint
ALTER TABLE "troubleshooting_issues" ADD CONSTRAINT "troubleshooting_issues_requester_id_technicians_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "technicians"("id") ON DELETE SET NULL;
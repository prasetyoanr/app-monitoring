ALTER TYPE "technician_role" ADD VALUE 'technician';--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "division_id" uuid;--> statement-breakpoint
CREATE INDEX "technicians_division_idx" ON "technicians" ("division_id");--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_division_id_master_divisions_id_fkey" FOREIGN KEY ("division_id") REFERENCES "master_divisions"("id") ON DELETE SET NULL;
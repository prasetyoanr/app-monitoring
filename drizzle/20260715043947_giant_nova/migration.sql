ALTER TABLE "technicians" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
UPDATE "technicians" SET "role" = 'supervisor' WHERE "role" = 'technician';--> statement-breakpoint
DROP TYPE "technician_role";--> statement-breakpoint
CREATE TYPE "technician_role" AS ENUM('administrator', 'supervisor');--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" SET DATA TYPE "technician_role" USING "role"::"technician_role";--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" SET DEFAULT 'supervisor'::"technician_role";

ALTER TABLE "technicians" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
UPDATE "technicians" SET "role" = 'boss' WHERE "role" = 'supervisor';--> statement-breakpoint
DROP TYPE "technician_role";--> statement-breakpoint
CREATE TYPE "technician_role" AS ENUM('administrator', 'boss');--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" SET DATA TYPE "technician_role" USING "role"::"technician_role";--> statement-breakpoint
ALTER TABLE "technicians" ALTER COLUMN "role" SET DEFAULT 'boss'::"technician_role";

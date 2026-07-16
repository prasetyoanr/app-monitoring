CREATE TABLE "master_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "master_divisions_name_unique" ON "master_divisions" (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "master_locations_name_unique" ON "master_locations" (lower("name"));--> statement-breakpoint
INSERT INTO "master_divisions" ("name") VALUES
	('Finance'),
	('Legal'),
	('Purchase'),
	('Human Resources'),
	('Production'),
	('Marketing'),
	('Warehouse');--> statement-breakpoint
INSERT INTO "master_locations" ("name") VALUES
	('HO'),
	('Factory');

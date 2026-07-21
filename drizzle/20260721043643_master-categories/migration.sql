CREATE TABLE "master_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "master_categories_name_unique" ON "master_categories" (lower("name"));
--> statement-breakpoint
INSERT INTO "master_categories" ("name") VALUES
  ('Software'),
  ('Hardware'),
  ('Network'),
  ('Server'),
  ('Other')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "master_categories" ("name")
SELECT DISTINCT trim("category")
FROM "troubleshooting_issues"
WHERE trim("category") <> ''
ON CONFLICT DO NOTHING;

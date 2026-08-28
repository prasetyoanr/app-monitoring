ALTER TABLE "master_divisions" ADD COLUMN "slug" varchar(80);--> statement-breakpoint
WITH "prepared_slugs" AS (
	SELECT
		"id",
		COALESCE(
			NULLIF(
				regexp_replace(
					left(trim(BOTH '-' FROM regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), 71),
					'-+$',
					'',
					'g'
				),
				''
			),
			'division'
		) AS "base_slug"
	FROM "master_divisions"
),
"ranked_slugs" AS (
	SELECT
		"id",
		"base_slug",
		row_number() OVER (PARTITION BY "base_slug" ORDER BY "id") AS "slug_rank"
	FROM "prepared_slugs"
)
UPDATE "master_divisions" AS "division"
SET "slug" = CASE
	WHEN "ranked"."slug_rank" = 1 THEN "ranked"."base_slug"
	ELSE "ranked"."base_slug" || '-' || left("division"."id"::text, 8)
END
FROM "ranked_slugs" AS "ranked"
WHERE "division"."id" = "ranked"."id";--> statement-breakpoint
ALTER TABLE "master_divisions" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "master_divisions_slug_unique" ON "master_divisions" ("slug");--> statement-breakpoint
ALTER TABLE "master_divisions" ADD CONSTRAINT "master_divisions_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

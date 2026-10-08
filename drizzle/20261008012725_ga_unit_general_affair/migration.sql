-- The General Affairs division is called "GA" in some databases and "General Affair" in
-- others. The earlier GA migration only opted in the slug `ga`, so in databases where the
-- division is `general-affair` its staff were not treated as GA staff (no work plans, no GA
-- assignments). Safe to run repeatedly; it only switches the flag on.
UPDATE "master_divisions" SET "is_ga_unit" = true WHERE "slug" IN ('general-affair', 'general-affairs') AND "is_ga_unit" = false;

-- Reassign existing plans to the Friday-Thursday reporting period that contains
-- their target date. PostgreSQL DOW uses Sunday = 0 and Friday = 5.
UPDATE "ga_work_plan_items"
SET "week_start" = "target_date" - (((extract(dow from "target_date")::integer + 2) % 7));

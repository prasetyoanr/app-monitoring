import "server-only";

import { and, inArray, or, sql } from "drizzle-orm";

import { gaWorkPlanItems } from "@/db/schema";

// Include a plan on its target date even when it was created much earlier.
// Open plans carry into later periods after their target date has passed.
// The same condition is used by the staff cards, detail view, and export.
export function gaWorkPlansForPeriod(start: string, end: string) {
  return or(
    sql`(${gaWorkPlanItems.createdAt} at time zone 'Asia/Jakarta')::date between ${start}::date and ${end}::date`,
    sql`${gaWorkPlanItems.targetDate} between ${start}::date and ${end}::date`,
    and(
      inArray(gaWorkPlanItems.status, ["planned", "in_progress"]),
      sql`(${gaWorkPlanItems.createdAt} at time zone 'Asia/Jakarta')::date <= ${end}::date`,
      or(
        sql`${gaWorkPlanItems.targetDate} <= ${end}::date`,
        sql`${gaWorkPlanItems.targetMode} = 'until_completed'`,
      ),
    ),
    sql`(${gaWorkPlanItems.updatedAt} at time zone 'Asia/Jakarta')::date between ${start}::date and ${end}::date`,
  );
}

import "server-only";

import { and, inArray, or, sql } from "drizzle-orm";

import { gaWorkPlanItems } from "@/db/schema";

// A plan belongs to its original reporting week and remains visible while open.
// A completed or cancelled carryover also appears in the week it was updated.
export function gaWorkPlansForPeriod(start: string, end: string) {
  return and(
    sql`${gaWorkPlanItems.weekStart}::date <= ${end}::date`,
    or(
      sql`(${gaWorkPlanItems.weekStart}::date + 6) >= ${start}::date`,
      inArray(gaWorkPlanItems.status, ["planned", "in_progress"]),
      sql`(${gaWorkPlanItems.updatedAt} at time zone 'Asia/Jakarta')::date between ${start}::date and ${end}::date`,
    ),
  );
}

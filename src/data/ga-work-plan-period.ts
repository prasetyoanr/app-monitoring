import "server-only";

import { and, inArray, or, sql } from "drizzle-orm";

import { gaWorkPlanItems } from "@/db/schema";

// Show plans created or changed in the selected dates, plus plans still open.
// The same condition is used by the staff cards, detail view, and export.
export function gaWorkPlansForPeriod(start: string, end: string) {
  return or(
    sql`(${gaWorkPlanItems.createdAt} at time zone 'Asia/Jakarta')::date between ${start}::date and ${end}::date`,
    and(
      inArray(gaWorkPlanItems.status, ["planned", "in_progress"]),
      sql`(${gaWorkPlanItems.createdAt} at time zone 'Asia/Jakarta')::date <= ${end}::date`,
    ),
    sql`(${gaWorkPlanItems.updatedAt} at time zone 'Asia/Jakarta')::date between ${start}::date and ${end}::date`,
  );
}

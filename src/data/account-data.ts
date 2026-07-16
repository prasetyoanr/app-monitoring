import "server-only";

import { asc, isNotNull } from "drizzle-orm";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { technicians } from "@/db/schema";
import type { AccountRecord } from "@/data/types";

const jakartaDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export async function getAccountRecords(): Promise<AccountRecord[]> {
  await requireAdministrator();
  const rows = await db
    .select({
      id: technicians.id,
      name: technicians.name,
      username: technicians.username,
      role: technicians.role,
      lockedUntil: technicians.lockedUntil,
      createdAt: technicians.createdAt,
    })
    .from(technicians)
    .where(isNotNull(technicians.username))
    .orderBy(asc(technicians.name));

  const now = new Date();
  return rows.map((row) => ({
      id: row.id,
      name: row.name,
      username: row.username ?? "",
      role: row.role,
      isLocked: Boolean(row.lockedUntil && row.lockedUntil > now),
      createdAt: jakartaDate.format(row.createdAt),
    }));
}

import "server-only";

import { asc, eq, isNotNull } from "drizzle-orm";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { masterDivisions, technicians } from "@/db/schema";
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
      divisionId: technicians.divisionId,
      division: masterDivisions.name,
      isActive: technicians.isActive,
      lockedUntil: technicians.lockedUntil,
      createdAt: technicians.createdAt,
    })
    .from(technicians)
    .leftJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(isNotNull(technicians.username))
    .orderBy(asc(technicians.username));

  const now = new Date();
  return rows.map((row) => ({
      id: row.id,
      name: row.role === "requester" ? (row.username ?? row.name) : row.name,
      username: row.username ?? "",
      role: row.role,
      divisionId: row.divisionId,
      division: row.division,
      isActive: row.isActive,
      isLocked: Boolean(row.lockedUntil && row.lockedUntil > now),
      createdAt: jakartaDate.format(row.createdAt),
    }));
}

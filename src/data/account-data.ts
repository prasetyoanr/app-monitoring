import "server-only";

import { asc, eq, isNotNull, max } from "drizzle-orm";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { authSessions, masterDivisions, technicians } from "@/db/schema";
import { lastSeenLabel, presenceOf } from "@/lib/presence";
import type { AccountRecord } from "@/data/types";

const jakartaDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export async function getAccountRecords(): Promise<AccountRecord[]> {
  await requireAdministrator();
  const [rows, activity] = await Promise.all([db
    .select({
      id: technicians.id,
      name: technicians.name,
      username: technicians.username,
      role: technicians.role,
      serviceLane: technicians.serviceLane,
      divisionId: technicians.divisionId,
      division: masterDivisions.name,
      isActive: technicians.isActive,
      lockedUntil: technicians.lockedUntil,
      createdAt: technicians.createdAt,
    })
    .from(technicians)
    .leftJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(isNotNull(technicians.username))
    .orderBy(asc(technicians.username)),
    // Most recent activity of each account's sessions (sessions end on logout or expiry).
    db
      .select({ technicianId: authSessions.technicianId, lastSeen: max(authSessions.lastUsedAt) })
      .from(authSessions)
      .groupBy(authSessions.technicianId),
  ]);
  const lastSeenById = new Map(activity.map((row) => [row.technicianId, row.lastSeen]));

  const now = new Date();
  return rows.map((row) => ({
      id: row.id,
      name: row.role === "requester" ? (row.username ?? row.name) : row.name,
      username: row.username ?? "",
      role: row.role,
      serviceLane: row.serviceLane,
      divisionId: row.divisionId,
      division: row.division,
      isActive: row.isActive,
      isLocked: Boolean(row.lockedUntil && row.lockedUntil > now),
      createdAt: jakartaDate.format(row.createdAt),
      presence: row.isActive ? presenceOf(lastSeenById.get(row.id), now) : "offline",
      lastSeenLabel: lastSeenLabel(lastSeenById.get(row.id), now),
    }));
}

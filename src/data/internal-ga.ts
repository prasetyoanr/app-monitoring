import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { gaInternalRequestEvents, gaInternalRequests, masterDivisions, technicians } from "@/db/schema";
import { GA_DIVISION_SLUGS } from "@/lib/request-destination";
import type { InternalGaStatus } from "@/lib/internal-ga";

export interface InternalGaEventRecord {
  id: string;
  kind: string;
  actorName: string;
  previousStatus: InternalGaStatus | null;
  status: InternalGaStatus | null;
  subjectName: string | null;
  note: string | null;
  createdAt: string;
}

export interface InternalGaRequestRecord {
  events: InternalGaEventRecord[];
  id: string;
  title: string;
  description: string;
  location: string | null;
  status: InternalGaStatus;
  createdById: string | null;
  createdByName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  resolutionNote: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface InternalGaMember {
  id: string;
  name: string;
  divisionName: string;
}

const INTERNAL_DIVISION_SLUGS = [...GA_DIVISION_SLUGS, "it-team"];

export async function getInternalGaMembers(): Promise<InternalGaMember[]> {
  return db
    .select({ id: technicians.id, name: technicians.name, divisionName: masterDivisions.name })
    .from(technicians)
    .innerJoin(masterDivisions, eq(masterDivisions.id, technicians.divisionId))
    .where(
      and(
        eq(technicians.isActive, true),
        inArray(masterDivisions.slug, INTERNAL_DIVISION_SLUGS),
      ),
    )
    .orderBy(technicians.name);
}

export async function getInternalGaRequests(userId: string): Promise<InternalGaRequestRecord[]> {
  const creator = alias(technicians, "internal_ga_creator");
  const assignee = alias(technicians, "internal_ga_assignee");
  const rows = await db
    .select({
      id: gaInternalRequests.id,
      title: gaInternalRequests.title,
      description: gaInternalRequests.description,
      location: gaInternalRequests.location,
      status: gaInternalRequests.status,
      createdById: gaInternalRequests.createdById,
      createdByName: creator.name,
      assignedToId: gaInternalRequests.assignedToId,
      assignedToName: assignee.name,
      resolutionNote: gaInternalRequests.resolutionNote,
      createdAt: gaInternalRequests.createdAt,
      completedAt: gaInternalRequests.completedAt,
    })
    .from(gaInternalRequests)
    .leftJoin(creator, eq(creator.id, gaInternalRequests.createdById))
    .leftJoin(assignee, eq(assignee.id, gaInternalRequests.assignedToId))
    .where(
      or(
        eq(gaInternalRequests.createdById, userId),
        eq(gaInternalRequests.assignedToId, userId),
        isNull(gaInternalRequests.assignedToId),
      ),
    )
    .orderBy(desc(gaInternalRequests.createdAt))
    .limit(500);

  const eventRows = rows.length
    ? await db
        .select({
          id: gaInternalRequestEvents.id,
          requestId: gaInternalRequestEvents.requestId,
          kind: gaInternalRequestEvents.kind,
          actorName: gaInternalRequestEvents.actorName,
          previousStatus: gaInternalRequestEvents.previousStatus,
          status: gaInternalRequestEvents.status,
          subjectName: gaInternalRequestEvents.subjectName,
          note: gaInternalRequestEvents.note,
          createdAt: gaInternalRequestEvents.createdAt,
        })
        .from(gaInternalRequestEvents)
        .where(inArray(gaInternalRequestEvents.requestId, rows.map((row) => row.id)))
        .orderBy(asc(gaInternalRequestEvents.createdAt))
    : [];
  const eventsByRequest = new Map<string, InternalGaEventRecord[]>();
  for (const { requestId, createdAt, ...event } of eventRows) {
    const list = eventsByRequest.get(requestId) ?? [];
    list.push({ ...event, createdAt: createdAt.toISOString() });
    eventsByRequest.set(requestId, list);
  }

  return rows.map((row) => ({
    ...row,
    createdByName: row.createdByName ?? "Former member",
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    events: eventsByRequest.get(row.id) ?? [],
  }));
}

export interface InternalGaWaiting {
  forMe: number;
  forTeam: number;
}

// Active requests that need the user: addressed to them, or to the whole team by someone else.
export async function getInternalGaWaiting(userId: string): Promise<InternalGaWaiting> {
  const active = inArray(gaInternalRequests.status, ["open", "in_progress"]);
  const [forMe, forTeam] = await Promise.all([
    db.select({ value: count() }).from(gaInternalRequests)
      .where(and(active, eq(gaInternalRequests.assignedToId, userId))),
    db.select({ value: count() }).from(gaInternalRequests)
      .where(and(active, isNull(gaInternalRequests.assignedToId), or(isNull(gaInternalRequests.createdById), ne(gaInternalRequests.createdById, userId)))),
  ]);
  return { forMe: forMe[0].value, forTeam: forTeam[0].value };
}

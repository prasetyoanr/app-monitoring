import "server-only";

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { gaInternalRequests, masterDivisions, technicians } from "@/db/schema";
import { GA_DIVISION_SLUGS } from "@/lib/request-destination";
import type { InternalGaStatus } from "@/lib/internal-ga";

export interface InternalGaRequestRecord {
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

  return rows.map((row) => ({
    ...row,
    createdByName: row.createdByName ?? "Former member",
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }));
}

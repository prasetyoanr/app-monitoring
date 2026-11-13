import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { AuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { kpiDowntimeWeeks, kpiScorecards, masterDivisions, technicians } from "@/db/schema";
import { getKpiSurveyRatings } from "@/data/kpi-survey";
import type { KpiItem, KpiMember } from "@/data/kpi-mock";
import { calculateKpiSurveyPeriods } from "@/lib/kpi-survey";
import { canReviewScorecard, type KpiOwnerRole, type KpiScorecardStatus } from "@/lib/kpi-approval";

export const KPI_OWNER_ROLES: KpiOwnerRole[] = ["receptionist", "service_agent", "approver", "final_approver"];

export function validKpiYear(value: number) {
  return Number.isInteger(value) && value >= 2020 && value <= 2100;
}

export function canViewKpiOwner(user: AuthenticatedUser, owner: { id: string; role: KpiOwnerRole }) {
  return user.role === "administrator" || user.id === owner.id || canReviewScorecard(user, owner);
}

export async function getKpiMembers(user: AuthenticatedUser, year: number): Promise<KpiMember[]> {
  if (!validKpiYear(year)) throw new Error("Tahun KPI tidak valid.");
  const people = await db.select({
    id: technicians.id,
    name: technicians.name,
    role: technicians.role,
    division: masterDivisions.name,
  }).from(technicians)
    .leftJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(and(eq(technicians.isActive, true), inArray(technicians.role, KPI_OWNER_ROLES)))
    .orderBy(technicians.name);
  const visible = people.filter((person) => canViewKpiOwner(user, person as { id: string; role: KpiOwnerRole }));
  if (!visible.length) return [];
  const cards = await db.select().from(kpiScorecards).where(and(
    eq(kpiScorecards.year, year),
    inArray(kpiScorecards.ownerId, visible.map((person) => person.id)),
  ));
  const byOwner = new Map(cards.map((card) => [card.ownerId, card]));
  const weeks = cards.length ? await db.select().from(kpiDowntimeWeeks).where(inArray(kpiDowntimeWeeks.scorecardId, cards.map((card) => card.id))) : [];
  const weeksByItem = new Map<string, KpiItem["downtimeWeeks"]>();
  for (const week of weeks) {
    const key = `${week.scorecardId}:${week.itemId}`;
    const entries = weeksByItem.get(key) ?? [];
    entries.push({ weekStart: week.weekStart, hours: week.hours, source: week.source as "manual" | "monitoring" });
    weeksByItem.set(key, entries);
  }
  const surveyIds = [...new Set(cards.flatMap((card) => ((card.items ?? []) as KpiItem[]).flatMap((item) => item.source === "survey.satisfaction" ? (item.surveyIds ?? []) : [])))];
  const surveyRatings = await getKpiSurveyRatings(year, surveyIds);
  const reviewerIds = [...new Set(cards.map((card) => card.reviewedById).filter((id): id is string => Boolean(id)))];
  const reviewers = reviewerIds.length
    ? await db.select({ id: technicians.id, name: technicians.name }).from(technicians).where(inArray(technicians.id, reviewerIds))
    : [];
  const reviewerNames = new Map(reviewers.map((reviewer) => [reviewer.id, reviewer.name]));
  return visible.map((person) => {
    const card = byOwner.get(person.id);
    return {
      id: person.id,
      name: person.name,
      division: person.division ?? "-",
      position: person.role === "service_agent" ? "Staff" : person.role === "receptionist" ? "Admin" : person.role === "approver" ? "First Approval" : "Final Approval",
      role: person.role as KpiOwnerRole,
      status: (card?.status ?? "draft") as KpiScorecardStatus,
      items: ((card?.items ?? []) as KpiItem[]).map((item) => {
        if (item.metricType === "weekly_downtime") return { ...item, downtimeWeeks: weeksByItem.get(`${card?.id}:${item.id}`) ?? [] };
        if (item.source === "survey.satisfaction") {
          const result = calculateKpiSurveyPeriods(item.frequency, item.surveyIds ?? [], surveyRatings);
          return { ...item, computedActuals: result.actuals, surveyEvidence: result.evidence };
        }
        return item;
      }),
      reviewNote: card?.reviewNote ?? undefined,
      reviewedBy: card?.reviewedById ? reviewerNames.get(card.reviewedById) : undefined,
      revision: card?.revision ?? 0,
    };
  });
}

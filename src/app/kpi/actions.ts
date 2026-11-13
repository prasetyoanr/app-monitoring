"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isITRoleUser, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { kpiDowntimeWeeks, kpiReviewEvents, kpiScorecards, technicians } from "@/db/schema";
import type { KpiItem } from "@/data/kpi-mock";
import { getKpiMembers, validKpiYear } from "@/data/kpi-workspace";
import { getKpiSurveyOptions } from "@/data/kpi-survey";
import { canEditScorecard, canReviewScorecard, submitScorecard, type KpiOwnerRole } from "@/lib/kpi-approval";
import { normalizeAttachmentLink } from "@/lib/kpi-attachment";
import { downtimeWeekEnd } from "@/lib/kpi-downtime";

const uuid = z.uuid();
const itemInput = z.object({
  id: uuid,
  metricType: z.enum(["standard", "weekly_downtime"]).optional(),
  objective: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(500),
  weight: z.number().finite().positive().max(100),
  unit: z.string().trim().min(1).max(32),
  target: z.number().finite().positive().max(1_000_000_000),
  frequency: z.object({ type: z.enum(["monthly", "custom", "quarterly", "half_yearly", "yearly"]), customMonths: z.number().int().min(1).max(12) }),
  aggregation: z.enum(["average", "cumulative", "latest"]),
  polarity: z.enum(["positive", "negative"]),
  kind: z.enum(["routine", "improvement"]),
  source: z.enum(["manual", "survey.satisfaction"]),
  surveyIds: z.array(uuid).max(20).optional(),
  dataSource: z.string().trim().max(500),
  formulaNote: z.string().trim().max(1000),
  actuals: z.record(z.string(), z.number().finite().min(0).max(1_000_000_000)),
});

function checkYear(year: number) {
  if (!validKpiYear(year)) throw new Error("Tahun KPI tidak valid.");
}

async function ownerFor(id: string) {
  uuid.parse(id);
  const [owner] = await db.select({ id: technicians.id, role: technicians.role, active: technicians.isActive })
    .from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!owner || !owner.active || !["receptionist", "service_agent", "approver", "final_approver"].includes(owner.role)) {
    throw new Error("Anggota KPI tidak ditemukan.");
  }
  return owner as { id: string; role: KpiOwnerRole; active: boolean };
}

async function cardFor(ownerId: string, year: number) {
  const [card] = await db.select().from(kpiScorecards).where(and(eq(kpiScorecards.ownerId, ownerId), eq(kpiScorecards.year, year))).limit(1);
  return card;
}

async function updatedMember(ownerId: string, year: number) {
  const user = await requireAuthenticatedUser();
  const members = await getKpiMembers(user, year);
  const member = members.find((entry) => entry.id === ownerId);
  if (!member) throw new Error("Akses KPI ditolak.");
  revalidatePath("/kpi");
  return member;
}

export async function saveKpiItemsAction(year: number, revision: number, rawItems: unknown) {
  const user = await requireAuthenticatedUser();
  if (user.role === "administrator" || user.role === "requester") throw new Error("Akses KPI ditolak.");
  checkYear(year);
  const parsed = z.array(itemInput).max(50).parse(rawItems);
  if (new Set(parsed.map((item) => item.id)).size !== parsed.length) throw new Error("ID KPI duplikat.");
  const surveyItems = parsed.filter((item) => item.source === "survey.satisfaction");
  if (surveyItems.length) {
    if (!isITRoleUser(user)) throw new Error("Sumber survei hanya tersedia untuk KPI IT.");
    const available = new Set((await getKpiSurveyOptions()).map((option) => option.id));
    for (const item of surveyItems) {
      if (!item.surveyIds?.length || item.surveyIds.some((id) => !available.has(id))) throw new Error("Pilih survei dengan pertanyaan rating KPI yang tersedia.");
      if (item.unit !== "%" || item.polarity !== "positive" || item.aggregation !== "average") throw new Error("KPI survei harus memakai persentase, polaritas positif, dan rata-rata.");
    }
  }
  for (const item of parsed) {
    if (item.metricType === "weekly_downtime" && (item.target !== 24 || item.unit !== "jam/minggu" || item.frequency.type !== "monthly" || item.aggregation !== "cumulative" || item.polarity !== "negative" || item.source !== "manual" || Object.keys(item.actuals).length > 0)) throw new Error("Aturan downtime harus 24 jam per minggu dan dihitung bulanan.");
    const allowed = item.frequency.type === "yearly" ? [6, 12] : Array.from({ length: 12 }, (_, i) => i + 1).filter((month) => month % (item.frequency.type === "quarterly" ? 3 : item.frequency.type === "half_yearly" ? 6 : item.frequency.type === "custom" ? item.frequency.customMonths : 1) === 0 || month === 12);
    if (Object.keys(item.actuals).some((month) => !allowed.includes(Number(month)))) throw new Error("Periode realisasi KPI tidak valid.");
  }
  const card = await cardFor(user.id, year);
  if ((card?.revision ?? 0) !== revision) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
  if (!canEditScorecard(user.role as KpiOwnerRole, (card?.status ?? "draft") as "draft" | "submitted" | "approved" | "rejected")) throw new Error("KPI sedang terkunci.");
  const oldItems = (card?.items ?? []) as KpiItem[];
  const previous = new Map(oldItems.map((item) => [item.id, item]));
  const items: KpiItem[] = parsed.map((item) => ({ ...item, surveyIds: item.source === "survey.satisfaction" ? item.surveyIds : [], actuals: item.source === "survey.satisfaction" ? {} : Object.fromEntries(Object.entries(item.actuals).map(([month, value]) => [Number(month), value])), attachments: previous.get(item.id)?.attachments ?? [] }));
  for (const item of items) {
    const before = previous.get(item.id);
    if (before?.metricType === "weekly_downtime" && item.metricType !== "weekly_downtime") throw new Error("Jenis KPI downtime tidak dapat diubah setelah dipakai.");
    if (item.metricType === "weekly_downtime" && before?.metricType !== "weekly_downtime") throw new Error("Jenis KPI downtime hanya tersedia pada indikator IT yang telah dikonfigurasi.");
  }
  const removedDowntimeIds = oldItems.filter((item) => item.metricType === "weekly_downtime" && !items.some((next) => next.id === item.id)).map((item) => item.id);
  if (card && removedDowntimeIds.length) {
    const recorded = await db.select({ itemId: kpiDowntimeWeeks.itemId }).from(kpiDowntimeWeeks).where(and(eq(kpiDowntimeWeeks.scorecardId, card.id), inArray(kpiDowntimeWeeks.itemId, removedDowntimeIds))).limit(1);
    if (recorded.length) throw new Error("KPI downtime dengan catatan mingguan tidak dapat dihapus.");
  }
  const complete = items.length > 0 && items.reduce((sum, item) => sum + item.weight, 0) === 100;
  const nextStatus = user.role === "final_approver" ? (complete ? "approved" : "draft") : card?.status === "rejected" ? "rejected" : "draft";
  await db.transaction(async (tx) => {
    if (card) {
      const [changed] = await tx.update(kpiScorecards).set({ items, status: nextStatus, revision: revision + 1, reviewedById: user.role === "final_approver" ? (complete ? user.id : null) : card.reviewedById, reviewedAt: user.role === "final_approver" ? (complete ? new Date() : null) : card.reviewedAt, updatedAt: new Date() })
        .where(and(eq(kpiScorecards.id, card.id), eq(kpiScorecards.revision, revision))).returning({ id: kpiScorecards.id });
      if (!changed) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
      // Keep file bytes for earlier immutable approval snapshots.
      if (user.role === "final_approver" && complete) await tx.insert(kpiReviewEvents).values({ scorecardId: card.id, revision: revision + 1, actorId: user.id, action: "self_approved", itemsSnapshot: items });
    } else {
      if (revision !== 0) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
      const [created] = await tx.insert(kpiScorecards).values({ ownerId: user.id, year, status: nextStatus, revision: 1, items, reviewedById: user.role === "final_approver" && complete ? user.id : null, reviewedAt: user.role === "final_approver" && complete ? new Date() : null }).onConflictDoNothing().returning({ id: kpiScorecards.id });
      if (!created) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
      if (user.role === "final_approver" && complete) await tx.insert(kpiReviewEvents).values({ scorecardId: created.id, revision: 1, actorId: user.id, action: "self_approved", itemsSnapshot: items });
    }
  });
  return updatedMember(user.id, year);
}

export async function saveKpiDowntimeWeekAction(year: number, itemId: string, weekStart: string, hours: number | null) {
  const user = await requireAuthenticatedUser();
  checkYear(year);
  uuid.parse(itemId);
  const weekEnd = downtimeWeekEnd(weekStart);
  if (!weekEnd || Number(weekEnd.slice(0, 4)) !== year) throw new Error("Pilih hari Senin dari minggu yang berakhir pada tahun pelaporan.");
  if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 168)) throw new Error("Jam downtime harus antara 0 dan 168.");
  const card = await cardFor(user.id, year);
  const item = (card?.items as KpiItem[] | undefined)?.find((entry) => entry.id === itemId);
  if (!card || item?.metricType !== "weekly_downtime") throw new Error("KPI downtime tidak ditemukan.");
  if (hours === null) {
    await db.delete(kpiDowntimeWeeks).where(and(eq(kpiDowntimeWeeks.scorecardId, card.id), eq(kpiDowntimeWeeks.itemId, itemId), eq(kpiDowntimeWeeks.weekStart, weekStart)));
  } else {
    await db.insert(kpiDowntimeWeeks).values({ scorecardId: card.id, itemId, weekStart, hours, source: "manual", updatedById: user.id, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [kpiDowntimeWeeks.scorecardId, kpiDowntimeWeeks.itemId, kpiDowntimeWeeks.weekStart], set: { hours, source: "manual", updatedById: user.id, updatedAt: new Date() } });
  }
  return updatedMember(user.id, year);
}

export async function submitKpiAction(year: number, revision: number) {
  const user = await requireAuthenticatedUser();
  if (user.role === "administrator" || user.role === "requester") throw new Error("Akses KPI ditolak.");
  checkYear(year);
  const card = await cardFor(user.id, year);
  if (!card || card.revision !== revision || !["draft", "rejected"].includes(card.status)) throw new Error("Data KPI telah berubah atau sedang terkunci.");
  const items = card.items as KpiItem[];
  const result = submitScorecard(user.role as KpiOwnerRole, items.length, items.reduce((sum, item) => sum + item.weight, 0));
  if (!result.ok) throw new Error(result.reason);
  await db.transaction(async (tx) => {
    const [changed] = await tx.update(kpiScorecards).set({ status: result.status, revision: revision + 1, reviewNote: null, reviewedById: result.status === "approved" ? user.id : null, submittedAt: new Date(), reviewedAt: result.status === "approved" ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(kpiScorecards.id, card.id), eq(kpiScorecards.revision, revision), sql`${kpiScorecards.status} IN ('draft', 'rejected')`)).returning({ id: kpiScorecards.id });
    if (!changed) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
    await tx.insert(kpiReviewEvents).values({ scorecardId: card.id, revision: revision + 1, actorId: user.id, action: result.status === "approved" ? "self_approved" : "submitted", itemsSnapshot: items });
  });
  return updatedMember(user.id, year);
}

export async function reviewKpiAction(ownerId: string, year: number, revision: number, approve: boolean, rawNote: string) {
  const user = await requireAuthenticatedUser();
  checkYear(year);
  const owner = await ownerFor(ownerId);
  if (!canReviewScorecard(user, owner)) throw new Error("Akses approval KPI ditolak.");
  const note = z.string().trim().max(2000).parse(rawNote);
  if (!approve && !note) throw new Error("Alasan penolakan wajib diisi.");
  const card = await cardFor(ownerId, year);
  if (!card || card.status !== "submitted" || card.revision !== revision) throw new Error("Pengajuan KPI sudah berubah. Muat ulang halaman.");
  await db.transaction(async (tx) => {
    const [changed] = await tx.update(kpiScorecards).set({ status: approve ? "approved" : "rejected", revision: revision + 1, reviewNote: note || null, reviewedById: user.id, reviewedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(kpiScorecards.id, card.id), eq(kpiScorecards.revision, revision), eq(kpiScorecards.status, "submitted"))).returning({ id: kpiScorecards.id });
    if (!changed) throw new Error("Pengajuan KPI sudah berubah. Muat ulang halaman.");
    await tx.insert(kpiReviewEvents).values({ scorecardId: card.id, revision: revision + 1, actorId: user.id, action: approve ? "approved" : "rejected", note, itemsSnapshot: card.items });
  });
  return updatedMember(ownerId, year);
}

export async function requestKpiChangesAction(year: number, revision: number) {
  const user = await requireAuthenticatedUser();
  checkYear(year);
  const card = await cardFor(user.id, year);
  if (!card || card.status !== "approved" || card.revision !== revision || user.role === "administrator" || user.role === "requester" || user.role === "final_approver") throw new Error("Perubahan KPI tidak dapat dimulai.");
  await db.transaction(async (tx) => {
    const [changed] = await tx.update(kpiScorecards).set({ status: "draft", revision: revision + 1, updatedAt: new Date() })
      .where(and(eq(kpiScorecards.id, card.id), eq(kpiScorecards.revision, revision), eq(kpiScorecards.status, "approved"))).returning({ id: kpiScorecards.id });
    if (!changed) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
    await tx.insert(kpiReviewEvents).values({ scorecardId: card.id, revision: revision + 1, actorId: user.id, action: "reopened", itemsSnapshot: card.items });
  });
  return updatedMember(user.id, year);
}

export async function addKpiLinkAction(year: number, itemId: string, revision: number, title: string, rawUrl: string) {
  const user = await requireAuthenticatedUser();
  if (user.role === "administrator" || user.role === "requester") throw new Error("Akses KPI ditolak.");
  checkYear(year);
  uuid.parse(itemId);
  const link = normalizeAttachmentLink(rawUrl);
  if (!link.ok) throw new Error(link.reason);
  const safeTitle = z.string().trim().max(200).parse(title) || link.host;
  const card = await cardFor(user.id, year);
  if (!card || card.revision !== revision || !canEditScorecard(user.role as KpiOwnerRole, card.status as "draft" | "submitted" | "approved" | "rejected")) throw new Error("KPI sedang terkunci atau telah berubah.");
  const items = card.items as KpiItem[];
  if (!items.some((item) => item.id === itemId)) throw new Error("KPI tidak ditemukan.");
  const next = items.map((item) => item.id === itemId ? { ...item, attachments: [...item.attachments, { id: crypto.randomUUID(), type: "link" as const, title: safeTitle, url: link.url, host: link.host, isSpreadsheet: link.isSpreadsheet, addedBy: user.name, addedAt: new Date().toISOString().slice(0, 10) }] } : item);
  await db.transaction(async (tx) => {
    const [changed] = await tx.update(kpiScorecards).set({ items: next, revision: revision + 1, reviewedById: user.role === "final_approver" ? user.id : card.reviewedById, reviewedAt: user.role === "final_approver" ? new Date() : card.reviewedAt, updatedAt: new Date() }).where(and(eq(kpiScorecards.id, card.id), eq(kpiScorecards.revision, revision))).returning({ id: kpiScorecards.id });
    if (!changed) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
    if (user.role === "final_approver" && card.status === "approved") await tx.insert(kpiReviewEvents).values({ scorecardId: card.id, revision: revision + 1, actorId: user.id, action: "self_approved", itemsSnapshot: next });
  });
  return updatedMember(user.id, year);
}

export async function removeKpiAttachmentAction(year: number, itemId: string, attachmentId: string, revision: number) {
  const user = await requireAuthenticatedUser();
  if (user.role === "administrator" || user.role === "requester") throw new Error("Akses KPI ditolak.");
  checkYear(year);
  uuid.parse(itemId);
  uuid.parse(attachmentId);
  const card = await cardFor(user.id, year);
  if (!card || card.revision !== revision || !canEditScorecard(user.role as KpiOwnerRole, card.status as "draft" | "submitted" | "approved" | "rejected")) throw new Error("KPI sedang terkunci atau telah berubah.");
  const items = card.items as KpiItem[];
  if (!items.some((item) => item.id === itemId && item.attachments.some((attachment) => attachment.id === attachmentId))) throw new Error("Lampiran tidak ditemukan.");
  const next = items.map((item) => item.id === itemId ? { ...item, attachments: item.attachments.filter((attachment) => attachment.id !== attachmentId) } : item);
  await db.transaction(async (tx) => {
    const [changed] = await tx.update(kpiScorecards).set({ items: next, revision: revision + 1, reviewedById: user.role === "final_approver" ? user.id : card.reviewedById, reviewedAt: user.role === "final_approver" ? new Date() : card.reviewedAt, updatedAt: new Date() }).where(and(eq(kpiScorecards.id, card.id), eq(kpiScorecards.revision, revision))).returning({ id: kpiScorecards.id });
    if (!changed) throw new Error("Data KPI telah berubah. Muat ulang halaman.");
    // The file is retained for previously submitted and approved snapshots.
    if (user.role === "final_approver" && card.status === "approved") await tx.insert(kpiReviewEvents).values({ scorecardId: card.id, revision: revision + 1, actorId: user.id, action: "self_approved", itemsSnapshot: next });
  });
  return updatedMember(user.id, year);
}

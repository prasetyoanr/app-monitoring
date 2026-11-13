import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/auth/session";
import { db } from "@/db";
import { kpiFiles, kpiReviewEvents, kpiScorecards } from "@/db/schema";
import type { KpiItem } from "@/data/kpi-mock";
import { validKpiYear } from "@/data/kpi-workspace";
import { canEditScorecard, type KpiOwnerRole } from "@/lib/kpi-approval";
import { KPI_ATTACHMENT_MAX_BYTES } from "@/lib/kpi-attachment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === "requester" || user.role === "administrator") return new Response("Forbidden", { status: 403 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  const year = Number(form.get("year"));
  const revision = Number(form.get("revision"));
  const itemId = String(form.get("itemId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  if (!(file instanceof File) || file.size < 1 || file.size > KPI_ATTACHMENT_MAX_BYTES || !validKpiYear(year) || !Number.isSafeInteger(revision) || !/^[0-9a-f-]{36}$/i.test(itemId) || title.length > 200) return new Response("Lampiran tidak valid.", { status: 400 });
  const name = file.name.replace(/[\r\n\\/]/g, "_").slice(0, 255);
  if (!name) return new Response("Nama file tidak valid.", { status: 400 });
  const [card] = await db.select().from(kpiScorecards).where(and(eq(kpiScorecards.ownerId, user.id), eq(kpiScorecards.year, year))).limit(1);
  if (!card || card.revision !== revision || !canEditScorecard(user.role as KpiOwnerRole, card.status as "draft" | "submitted" | "approved" | "rejected")) return new Response("KPI terkunci atau telah berubah.", { status: 409 });
  const items = card.items as KpiItem[];
  if (!items.some((item) => item.id === itemId)) return new Response("KPI tidak ditemukan.", { status: 404 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const attachmentId = crypto.randomUUID();
  const next = items.map((item) => item.id === itemId ? { ...item, attachments: [...item.attachments, { id: attachmentId, type: "file" as const, title: title || name, fileName: name, fileSize: bytes.length, previewUrl: `/kpi/files/${attachmentId}`, addedBy: user.name, addedAt: new Date().toISOString().slice(0, 10) }] } : item);
  try {
    await db.transaction(async (tx) => {
      const [changed] = await tx.update(kpiScorecards).set({ items: next, revision: revision + 1, reviewedById: user.role === "final_approver" ? user.id : card.reviewedById, reviewedAt: user.role === "final_approver" ? new Date() : card.reviewedAt, updatedAt: new Date() }).where(and(eq(kpiScorecards.id, card.id), eq(kpiScorecards.revision, revision))).returning({ id: kpiScorecards.id });
      if (!changed) throw new Error("KPI terkunci atau telah berubah.");
      await tx.insert(kpiFiles).values({ id: attachmentId, scorecardId: card.id, itemId, name, mimeType: file.type || "application/octet-stream", bytes });
      if (user.role === "final_approver" && card.status === "approved") await tx.insert(kpiReviewEvents).values({ scorecardId: card.id, revision: revision + 1, actorId: user.id, action: "self_approved", itemsSnapshot: next });
    });
  } catch {
    return new Response("KPI telah berubah. Muat ulang halaman.", { status: 409 });
  }
  return Response.json({ ok: true });
}

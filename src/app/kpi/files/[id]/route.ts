import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/auth/session";
import { db } from "@/db";
import { kpiFiles, kpiReviewEvents, kpiScorecards, technicians } from "@/db/schema";
import type { KpiItem } from "@/data/kpi-mock";
import { canViewKpiOwner } from "@/data/kpi-workspace";
import type { KpiOwnerRole } from "@/lib/kpi-approval";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "requester") return new Response("Not found", { status: 404 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [entry] = await db.select({ file: kpiFiles, card: kpiScorecards, ownerRole: technicians.role, ownerActive: technicians.isActive })
    .from(kpiFiles)
    .innerJoin(kpiScorecards, eq(kpiFiles.scorecardId, kpiScorecards.id))
    .innerJoin(technicians, eq(kpiScorecards.ownerId, technicians.id))
    .where(eq(kpiFiles.id, id)).limit(1);
  if (!entry || !entry.ownerActive || !(["receptionist", "service_agent", "approver", "final_approver"] as string[]).includes(entry.ownerRole) || !canViewKpiOwner(user, { id: entry.card.ownerId, role: entry.ownerRole as KpiOwnerRole })) return new Response("Not found", { status: 404 });
  const presentIn = (items: KpiItem[]) => items.some((item) => item.id === entry.file.itemId && item.attachments.some((attachment) => attachment.id === id && attachment.type === "file"));
  if (!presentIn(entry.card.items as KpiItem[])) {
    const events = await db.select({ snapshot: kpiReviewEvents.itemsSnapshot }).from(kpiReviewEvents).where(eq(kpiReviewEvents.scorecardId, entry.card.id));
    if (!events.some((event) => presentIn(event.snapshot as KpiItem[]))) return new Response("Not found", { status: 404 });
  }
  const safeName = entry.file.name.replace(/["\r\n\\]/g, "_");
  return new Response(new Uint8Array(entry.file.bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(entry.file.bytes.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

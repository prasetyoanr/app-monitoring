"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, gaInternalNotifications, gaInternalRequestEvents, gaInternalRequests, masterDivisions, technicians } from "@/db/schema";
import { getInternalGaMembers } from "@/data/internal-ga";
import type { ActionResult } from "@/data/types";
import { recordAuthorizationDenied } from "@/security/audit";
import {
  canUseInternalGa,
  INTERNAL_GA_STATUSES,
  internalGaCreateRecipients,
  internalGaMoveAllowed,
  internalGaStatusRecipients,
  internalGaTransitionError,
  isInternalGaDivisionSlug,
  type InternalGaStatus,
} from "@/lib/internal-ga";

function revalidateInternalPages() {
  revalidatePath("/internal");
  revalidatePath("/internal/inbox");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textField(formData: FormData, key: string, max: number, required: boolean, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (required && !value) throw new Error(`${label} is required.`);
  if (value.length > max) throw new Error(`${label} must not exceed ${max} characters.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new Error(`${label} contains invalid characters.`);
  return value;
}

export async function createInternalGaRequestAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireAuthenticatedUser();
  try {
    if (!canUseInternalGa(currentUser)) {
      await recordAuthorizationDenied(currentUser, "ga.internal.create");
      throw new Error("The internal GA room is only available to the GA team.");
    }
    const title = textField(formData, "title", 200, true, "Title");
    const description = textField(formData, "description", 10_000, true, "Description");
    const location = textField(formData, "location", 160, false, "Location");
    const assignedToId = String(formData.get("assignedToId") ?? "").trim();
    let recipientName: string | null = null;

    if (assignedToId) {
      if (!UUID.test(assignedToId)) throw new Error("The recipient is invalid.");
      const [recipient] = await db
        .select({ slug: masterDivisions.slug, isActive: technicians.isActive, name: technicians.name })
        .from(technicians)
        .leftJoin(masterDivisions, eq(masterDivisions.id, technicians.divisionId))
        .where(eq(technicians.id, assignedToId))
        .limit(1);
      if (!recipient?.isActive || !isInternalGaDivisionSlug(recipient.slug)) {
        throw new Error("The recipient is not an active member of the GA team.");
      }
      recipientName = recipient.name;
    }

    const memberIds = assignedToId ? [] : (await getInternalGaMembers()).map((member) => member.id);
    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(gaInternalRequests)
        .values({
          title,
          description,
          location: location || null,
          createdById: currentUser.id,
          assignedToId: assignedToId || null,
        })
        .returning({ id: gaInternalRequests.id });
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "ga_internal_request.created",
        entityType: "ga_internal_request",
        entityId: row.id,
        metadata: { assignedToId: assignedToId || null },
      });
      await tx.insert(gaInternalRequestEvents).values({
        requestId: row.id,
        kind: "created",
        actorId: currentUser.id,
        actorName: currentUser.name,
        status: "open",
        subjectName: recipientName,
      });
      const { kind, recipientIds } = internalGaCreateRecipients({
        creatorId: currentUser.id,
        assignedToId: assignedToId || null,
        memberIds,
      });
      if (recipientIds.length) {
        await tx.insert(gaInternalNotifications).values(
          recipientIds.map((recipientId) => ({ recipientId, requestId: row.id, actorId: currentUser.id, kind })),
        );
      }
      return row.id;
    });
    revalidateInternalPages();
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("Unable to create internal GA request.", error);
    return { ok: false, error: error instanceof Error ? error.message : "The request could not be saved." };
  }
}

export async function updateInternalGaStatusAction(
  id: string,
  status: InternalGaStatus,
  resolutionNote: string,
): Promise<ActionResult> {
  const currentUser = await requireAuthenticatedUser();
  try {
    if (!canUseInternalGa(currentUser)) {
      await recordAuthorizationDenied(currentUser, "ga.internal.update", { requestId: id });
      throw new Error("The internal GA room is only available to the GA team.");
    }
    if (!UUID.test(id)) throw new Error("The request is invalid.");
    if (!INTERNAL_GA_STATUSES.includes(status)) throw new Error("The status is invalid.");
    const note = String(resolutionNote ?? "").trim();
    if (note.length > 2_000) throw new Error("The note must not exceed 2000 characters.");

    await db.transaction(async (tx) => {
      const [request] = await tx
        .select({
          status: gaInternalRequests.status,
          createdById: gaInternalRequests.createdById,
          assignedToId: gaInternalRequests.assignedToId,
        })
        .from(gaInternalRequests)
        .where(eq(gaInternalRequests.id, id))
        .for("update")
        .limit(1);
      if (!request) throw new Error("The request was not found.");
      const denied = internalGaTransitionError(currentUser.id, request, status);
      if (denied) {
        // A move the status machine refuses is a stale screen; anything else is a person
        // acting on a request they have no right to change.
        if (internalGaMoveAllowed(request.status, status)) {
          await recordAuthorizationDenied(currentUser, "ga.internal.update", { requestId: id, status });
        }
        throw new Error(denied);
      }

      const finished = status === "done" || status === "cancelled";
      await tx
        .update(gaInternalRequests)
        .set({
          status,
          // Picking up a team-wide request makes that person responsible for it.
          ...(status === "in_progress" && request.assignedToId === null ? { assignedToId: currentUser.id } : {}),
          resolutionNote: finished ? note || null : null,
          completedAt: finished ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(gaInternalRequests.id, id));
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "ga_internal_request.status_changed",
        entityType: "ga_internal_request",
        entityId: id,
        metadata: { previousStatus: request.status, status, hasNote: Boolean(finished && note) },
      });
      await tx.insert(gaInternalRequestEvents).values({
        requestId: id,
        kind: "status_changed",
        actorId: currentUser.id,
        actorName: currentUser.name,
        previousStatus: request.status,
        status,
        note: finished ? note || null : null,
      });
      if (status === "in_progress" && request.assignedToId === null) {
        await tx.insert(gaInternalRequestEvents).values({
          requestId: id,
          kind: "assigned",
          actorId: currentUser.id,
          actorName: currentUser.name,
          subjectName: currentUser.name,
        });
      }
      const notify = internalGaStatusRecipients({
        actorId: currentUser.id,
        createdById: request.createdById,
        assignedToId: request.assignedToId,
        status,
      });
      if (notify) {
        await tx.insert(gaInternalNotifications).values(
          notify.recipientIds.map((recipientId) => ({
            recipientId,
            requestId: id,
            actorId: currentUser.id,
            kind: notify.kind,
            note: finished ? note || null : null,
          })),
        );
      }
    });
    revalidateInternalPages();
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to update internal GA request.", error);
    return { ok: false, error: error instanceof Error ? error.message : "The status could not be updated." };
  }
}

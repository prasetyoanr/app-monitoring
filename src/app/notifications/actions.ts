"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { requestStatusNotifications, workflowNotifications } from "@/db/schema";
import type { ActionResult } from "@/data/types";

export async function markRequestNotificationsReadAction(): Promise<ActionResult> {
  const currentUser = await requireAuthenticatedUser();
  try {
    await db
      .update(requestStatusNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(requestStatusNotifications.recipientId, currentUser.id),
          isNull(requestStatusNotifications.readAt),
        ),
      );

    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to mark request notifications as read.", error);
    return { ok: false, error: "Unable to update notifications." };
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Marks one notification read, or all of the caller's unread ones when no id is given.
export async function markWorkflowNotificationsReadAction(id?: string): Promise<ActionResult> {
  const currentUser = await requireAuthenticatedUser();
  if (id !== undefined && !uuidPattern.test(id)) return { ok: false, error: "Invalid notification." };
  try {
    await db
      .update(workflowNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(workflowNotifications.recipientId, currentUser.id),
          isNull(workflowNotifications.readAt),
          id ? eq(workflowNotifications.id, id) : undefined,
        ),
      );
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to mark workflow notifications as read.", error);
    return { ok: false, error: "Unable to update notifications." };
  }
}

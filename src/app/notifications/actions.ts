"use server";

import { and, eq, isNull } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { requestStatusNotifications } from "@/db/schema";
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

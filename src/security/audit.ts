import "server-only";

import type { AuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

function actorType(user: AuthenticatedUser): "technician" | "requester" {
  return user.role === "requester" ? "requester" : "technician";
}

export async function recordAuthorizationDenied(
  user: AuthenticatedUser,
  capability: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await db.insert(auditLogs).values({
      actorType: actorType(user),
      actorId: user.id,
      action: "authorization.denied",
      entityType: "authorization",
      entityId: capability.slice(0, 120),
      metadata: { role: user.role, ...metadata },
    });
  } catch (error) {
    console.error("Unable to record denied authorization.", error);
  }
}

export async function recordSensitiveDataAccess(
  user: AuthenticatedUser,
  entityType: string,
  entityId: string,
  dataType: string,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(auditLogs).values({
    actorType: actorType(user),
    actorId: user.id,
    action: "sensitive_data.accessed",
    entityType: entityType.slice(0, 80),
    entityId: entityId.slice(0, 120),
    metadata: { dataType, ...metadata },
  });
}

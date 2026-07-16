import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { backupUserInvitations } from "@/db/schema";

export interface BackupInvitationRecord {
  token: string;
  status: "pending" | "submitted" | "expired" | "revoked";
  expiresAt: string;
}

export async function getBackupInvitationByToken(
  token: string,
): Promise<BackupInvitationRecord | null> {
  if (!/^(?:[A-Za-z0-9_-]{16}|[A-Za-z0-9_-]{43})$/.test(token)) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [invitation] = await db
    .select({
      status: backupUserInvitations.status,
      expiresAt: backupUserInvitations.expiresAt,
    })
    .from(backupUserInvitations)
    .where(eq(backupUserInvitations.tokenHash, tokenHash))
    .limit(1);

  if (!invitation) return null;
  const status =
    invitation.status === "pending" && invitation.expiresAt <= new Date()
      ? "expired"
      : invitation.status;
  return { token, status, expiresAt: invitation.expiresAt.toISOString() };
}

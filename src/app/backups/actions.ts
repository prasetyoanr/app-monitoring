"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireITRoleUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, backupUserInvitations, backupUsers } from "@/db/schema";
import type { ActionResult, BackupStatus } from "@/data/types";
import { generateRecordId } from "@/lib/record-id";
import {
  decryptBackupCredential,
  encryptBackupCredential,
} from "@/security/backup-credentials";
import { recordSensitiveDataAccess } from "@/security/audit";

const statuses: BackupStatus[] = ["Success", "Failed", "Overdue", "Pending"];

function isValidBackupId(id: string) {
  return /^BKU-[0-9]{4}-[0-9]{4,6}$/.test(id);
}

function value(formData: FormData, name: string, maxLength: number, required = true) {
  const result = String(formData.get(name) ?? "").trim();
  if ((required && !result) || result.length > maxLength) {
    throw new Error(`${name} is invalid.`);
  }
  return result;
}

function credentialValue(formData: FormData) {
  const result = String(formData.get("passwordInformation") ?? "");
  if (result.length > 2_000) throw new Error("passwordInformation is invalid.");
  return result;
}

async function nextBackupId() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = generateRecordId("BKU");
    const [existing] = await db
      .select({ id: backupUsers.id })
      .from(backupUsers)
      .where(eq(backupUsers.id, id))
      .limit(1);
    if (!existing) return id;
  }
  throw new Error("Unable to generate a unique backup ID.");
}

export async function saveBackupAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireITRoleUser("backup_user.save");
  try {
    const id = value(formData, "id", 32, false) || (await nextBackupId());
    const fullName = value(formData, "user", 120);
    const division = value(formData, "division", 120);
    const username = value(formData, "username", 120, false) || null;
    const email = value(formData, "email", 254, false) || null;
    const rawPasswordInformation = credentialValue(formData);
    const passwordInformation = rawPasswordInformation
      ? encryptBackupCredential(rawPasswordInformation)
      : null;
    const syncPath =
      value(formData, "syncPath", 2_000, false) || "Waiting for IT setup";
    const status = value(formData, "status", 20) as BackupStatus;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email address is invalid.");
    }
    if (!statuses.includes(status)) throw new Error("Backup status is invalid.");

    const [existing] = await db
      .select({ id: backupUsers.id })
      .from(backupUsers)
      .where(eq(backupUsers.id, id))
      .limit(1);
    const common = {
      fullName,
      division,
      username,
      email,
      passwordInformation,
      syncPath,
      status,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(backupUsers).set(common).where(eq(backupUsers.id, id));
    } else {
      await db.insert(backupUsers).values({
        id,
        ...common,
        lastBackupAt: null,
      });
    }
    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: existing ? "backup_user.updated" : "backup_user.created",
      entityType: "backup_user",
      entityId: id,
    });
    revalidatePath("/");
    revalidatePath("/backups");
    revalidatePath("/reports");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("Unable to save backup user.", error);
    const message =
      error instanceof Error ? error.message : "Unable to save backup user.";
    return { ok: false, error: message };
  }
}

export async function createBackupInvitationAction(): Promise<
  ActionResult<{ token: string; expiresAt: string }>
> {
  const currentUser = await requireITRoleUser("backup_invitation.create");
  try {
    // Fail before creating a usable link when credential encryption is missing.
    encryptBackupCredential("configuration-check");
    const token = randomBytes(12).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      const [invitation] = await tx
        .insert(backupUserInvitations)
        .values({
          tokenHash,
          createdByTechnicianId: currentUser.id,
          expiresAt,
        })
        .returning({ id: backupUserInvitations.id });
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "backup_invitation.created",
        entityType: "backup_user_invitation",
        entityId: invitation.id,
        metadata: { expiresAt: expiresAt.toISOString() },
      });
    });

    return { ok: true, data: { token, expiresAt: expiresAt.toISOString() } };
  } catch (error) {
    console.error("Unable to create backup invitation.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create client invitation.",
    };
  }
}

export async function getBackupCredentialAction(
  id: string,
): Promise<ActionResult<{ passwordInformation: string }>> {
  const currentUser = await requireITRoleUser("backup_credential.view");
  try {
    if (!isValidBackupId(id)) throw new Error("Invalid backup ID.");
    const [record] = await db
      .select({ passwordInformation: backupUsers.passwordInformation })
      .from(backupUsers)
      .where(eq(backupUsers.id, id))
      .limit(1);
    if (!record) throw new Error("Backup record was not found.");

    await recordSensitiveDataAccess(currentUser, "backup_user", id, "backup_credential");
    return {
      ok: true,
      data: {
        passwordInformation: decryptBackupCredential(
          record.passwordInformation,
        ),
      },
    };
  } catch (error) {
    console.error("Unable to read backup credential.", error);
    return { ok: false, error: "Unable to load Synology password." };
  }
}

function invitationTokenHash(token: string) {
  if (!/^(?:[A-Za-z0-9_-]{16}|[A-Za-z0-9_-]{43})$/.test(token)) {
    throw new Error("The invitation link is invalid.");
  }
  return createHash("sha256").update(token).digest("hex");
}

export async function submitBackupInvitationAction(input: {
  token: string;
  fullName: string;
  division: string;
  email: string;
  username: string;
  passwordInformation: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const tokenHash = invitationTokenHash(input.token);
    const fullName = input.fullName.trim();
    const division = input.division.trim();
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();
    const password = input.passwordInformation;

    if (!fullName || fullName.length > 120) throw new Error("Full name is invalid.");
    if (!division || division.length > 120) throw new Error("Division is invalid.");
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new Error("Email address is invalid.");
    }
    if (!username || username.length > 120) throw new Error("Username is invalid.");
    if (!password.trim() || password.length > 2_000) throw new Error("Synology password is invalid.");

    const id = await nextBackupId();
    const submittedAt = new Date();
    const encryptedPassword = encryptBackupCredential(password);

    await db.transaction(async (tx) => {
      const [invitation] = await tx
        .update(backupUserInvitations)
        .set({ status: "submitted", submittedAt })
        .where(
          and(
            eq(backupUserInvitations.tokenHash, tokenHash),
            eq(backupUserInvitations.status, "pending"),
            gt(backupUserInvitations.expiresAt, submittedAt),
          ),
        )
        .returning({ id: backupUserInvitations.id });
      if (!invitation) {
        throw new Error("This invitation has expired or has already been used.");
      }

      await tx.insert(backupUsers).values({
        id,
        fullName,
        division,
        email: email || null,
        username,
        passwordInformation: encryptedPassword,
        syncPath: "Waiting for IT setup",
        lastBackupAt: null,
        status: "Pending",
      });
      await tx
        .update(backupUserInvitations)
        .set({ backupUserId: id })
        .where(eq(backupUserInvitations.id, invitation.id));
      await tx.insert(auditLogs).values({
        actorType: "client",
        actorId: email || null,
        action: "backup_user.submitted",
        entityType: "backup_user",
        entityId: id,
        metadata: { division, invitationId: invitation.id },
      });
    });

    revalidatePath("/");
    revalidatePath("/backups");
    revalidatePath("/reports");
    return { ok: true, data: { id } };
  } catch (error) {
    console.error("Unable to submit backup invitation.", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to submit backup information.",
    };
  }
}

export async function deleteBackupAction(id: string): Promise<ActionResult> {
  const currentUser = await requireITRoleUser("backup_user.delete");
  try {
    if (!isValidBackupId(id)) throw new Error("Invalid ID.");
    const [deleted] = await db
      .delete(backupUsers)
      .where(eq(backupUsers.id, id))
      .returning({ id: backupUsers.id });
    if (!deleted) throw new Error("Backup record was not found.");
    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: "backup_user.deleted",
      entityType: "backup_user",
      entityId: id,
    });
    revalidatePath("/");
    revalidatePath("/backups");
    revalidatePath("/reports");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to delete backup user.", error);
    return { ok: false, error: "Unable to delete backup record." };
  }
}

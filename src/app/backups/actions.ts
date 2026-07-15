"use server";

import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, backupUsers } from "@/db/schema";
import type { ActionResult, BackupStatus } from "@/data/types";

const statuses: BackupStatus[] = ["Success", "Failed", "Overdue", "Pending"];

function value(formData: FormData, name: string, maxLength: number, required = true) {
  const result = String(formData.get(name) ?? "").trim();
  if ((required && !result) || result.length > maxLength) {
    throw new Error(`${name} is invalid.`);
  }
  return result;
}

function nextBackupId() {
  return `BKU-${new Date().getFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

export async function saveBackupAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireAdministrator();
  try {
    const id = value(formData, "id", 32, false) || nextBackupId();
    const fullName = value(formData, "user", 120);
    const username = value(formData, "username", 120, false) || null;
    const email = value(formData, "email", 254, false) || null;
    const passwordInformation =
      value(formData, "passwordInformation", 2_000, false) || null;
    const syncPath = value(formData, "syncPath", 2_000);
    const lastBackupIso = value(formData, "lastBackupIso", 32);
    const status = value(formData, "status", 20) as BackupStatus;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email address is invalid.");
    }
    if (!statuses.includes(status)) throw new Error("Backup status is invalid.");
    const lastBackupAt = new Date(`${lastBackupIso}:00+07:00`);
    if (Number.isNaN(lastBackupAt.getTime())) throw new Error("Backup time is invalid.");

    const [existing] = await db
      .select({ id: backupUsers.id })
      .from(backupUsers)
      .where(eq(backupUsers.id, id))
      .limit(1);
    const common = {
      fullName,
      username,
      email,
      passwordInformation,
      syncPath,
      lastBackupAt,
      status,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(backupUsers).set(common).where(eq(backupUsers.id, id));
    } else {
      await db.insert(backupUsers).values({ id, ...common });
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

export async function deleteBackupAction(id: string): Promise<ActionResult> {
  const currentUser = await requireAdministrator();
  try {
    if (!/^BKU-[0-9]{4}-[0-9]{4,6}$/.test(id)) throw new Error("Invalid ID.");
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

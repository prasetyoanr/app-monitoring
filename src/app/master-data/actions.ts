"use server";

import { randomUUID } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import {
  auditLogs,
  masterCategories,
  masterDivisions,
  masterLocations,
} from "@/db/schema";
import type { ActionResult } from "@/data/types";
import { getServiceRequestTemplate } from "@/features/service-requests/template-registry";
import { isInboxProfileKey } from "@/features/service-inbox/profile-registry";
import { divisionSlugFromName } from "@/lib/division-slug";

export type MasterDataType = "division" | "location" | "category";

function masterTable(type: MasterDataType) {
  if (type === "division") return masterDivisions;
  if (type === "location") return masterLocations;
  return masterCategories;
}

function masterLabel(type: MasterDataType) {
  if (type === "division") return "Division";
  if (type === "location") return "Location";
  return "Category";
}

function validName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error("Name must contain 1 to 120 valid characters.");
  }
  return name;
}

function validId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid master data ID.");
  }
}

function revalidateMasterData(type: MasterDataType) {
  revalidatePath("/master-data");
  revalidatePath("/inbox");
  if (type === "division") {
    revalidatePath("/");
    revalidatePath("/backups");
    revalidatePath("/requests");
    revalidatePath("/reports");
  }
}

export async function updateDivisionRequestSettingsAction(
  id: string,
  isServiceTarget: boolean,
  requestFormKey: string | null,
  inboxProfileKey: string,
): Promise<ActionResult> {
  const currentUser = await requireAdministrator();
  try {
    validId(id);
    const normalizedFormKey = requestFormKey?.trim() || null;
    if (normalizedFormKey && !getServiceRequestTemplate(normalizedFormKey)) {
      throw new Error("Template form tidak valid.");
    }
    if (!isInboxProfileKey(inboxProfileKey)) {
      throw new Error("Profil Inbox tidak valid.");
    }

    const [updated] = await db
      .update(masterDivisions)
      .set({
        isServiceTarget,
        requestFormKey: isServiceTarget ? normalizedFormKey : null,
        inboxProfileKey,
      })
      .where(eq(masterDivisions.id, id))
      .returning({ id: masterDivisions.id, name: masterDivisions.name });
    if (!updated) throw new Error("Divisi tidak ditemukan.");

    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: "master_division.request_settings_updated",
      entityType: "master_division",
      entityId: updated.id,
      metadata: {
        inboxProfileKey,
        isServiceTarget,
        requestFormKey: isServiceTarget ? normalizedFormKey : null,
      },
    });
    revalidateMasterData("division");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to update division request settings.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Pengaturan tujuan divisi tidak dapat disimpan.",
    };
  }
}

export async function createMasterItemAction(
  type: MasterDataType,
  inputName: string,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireAdministrator();
  try {
    const name = validName(inputName);
    const table = masterTable(type);
    const [duplicate] = await db
      .select({ id: table.id })
      .from(table)
      .where(sql`lower(${table.name}) = lower(${name})`)
      .limit(1);
    if (duplicate) throw new Error(`${masterLabel(type)} already exists.`);

    const [created] = type === "division"
      ? await (async () => {
          const baseSlug = divisionSlugFromName(name);
          const [slugCollision] = await db
            .select({ id: masterDivisions.id })
            .from(masterDivisions)
            .where(eq(masterDivisions.slug, baseSlug))
            .limit(1);
          const slug = slugCollision
            ? `${baseSlug.slice(0, 71).replace(/-+$/g, "")}-${randomUUID().slice(0, 8)}`
            : baseSlug;
          return db
            .insert(masterDivisions)
            .values({ name, slug })
            .returning({ id: masterDivisions.id });
        })()
      : await db
          .insert(table)
          .values({ name })
          .returning({ id: table.id });
    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: `master_${type}.created`,
      entityType: `master_${type}`,
      entityId: created.id,
      metadata: { name },
    });
    revalidateMasterData(type);
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error(`Unable to create master ${type}.`, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create master data.",
    };
  }
}

export async function deleteMasterItemAction(
  type: MasterDataType,
  id: string,
): Promise<ActionResult> {
  const currentUser = await requireAdministrator();
  try {
    validId(id);
    const table = masterTable(type);
    const [{ total }] = await db.select({ total: count() }).from(table);
    if (total <= 1) {
      throw new Error(`At least one ${type} must remain available.`);
    }
    const [deleted] = await db
      .delete(table)
      .where(eq(table.id, id))
      .returning({ id: table.id, name: table.name });
    if (!deleted) throw new Error("Master data was not found.");

    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: `master_${type}.deleted`,
      entityType: `master_${type}`,
      entityId: deleted.id,
      metadata: { name: deleted.name },
    });
    revalidateMasterData(type);
    return { ok: true, data: undefined };
  } catch (error) {
    console.error(`Unable to delete master ${type}.`, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete master data.",
    };
  }
}

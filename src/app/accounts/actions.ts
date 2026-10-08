"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { hashPassword } from "@/auth/password";
import { requireAdministrator } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, authSessions, masterDivisions, technicians } from "@/db/schema";
import type { AccountRole, ActionResult } from "@/data/types";
import { accountRoleAllowsDivision, accountRoleRequiresDivision } from "@/lib/account-role";
import { recordAuthorizationDenied } from "@/security/audit";

const accountRoles: AccountRole[] = [
  "administrator",
  "receptionist",
  "approver",
  "final_approver",
  "service_agent",
  "requester",
];

function formValue(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value || value.length > maxLength) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

function validAccountId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function optionalUuid(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!validAccountId(normalized)) throw new Error("Division is invalid.");
  return normalized;
}

async function validatedDivisionId(role: AccountRole, rawValue: string) {
  // The administrator is never tied to a division.
  if (!accountRoleAllowsDivision(role)) return null;
  const divisionId = optionalUuid(rawValue);
  if (!divisionId) {
    // Empty means global, which only Admin and approval roles may use.
    if (accountRoleRequiresDivision(role)) throw new Error("Requesters and Staff must have a division or unit.");
    return null;
  }
  const [division] = await db
    .select({ id: masterDivisions.id })
    .from(masterDivisions)
    .where(eq(masterDivisions.id, divisionId))
    .limit(1);
  if (!division) throw new Error("Division not found.");
  return division.id;
}

export async function createAccountAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const currentUser = await requireAdministrator("account.create");
  try {
    const username = formValue(formData, "username", 80).toLowerCase();
    const name = username;
    const password = formValue(formData, "password", 128);
    const role = formValue(formData, "role", 20) as AccountRole;

    if (!/^[a-z0-9._-]{2,80}$/.test(username)) {
      throw new Error("Username may only contain lowercase letters, numbers, dots, underscores, or dashes.");
    }
    if (!accountRoles.includes(role)) throw new Error("Account role is invalid.");
    const divisionId = await validatedDivisionId(role, String(formData.get("divisionId") ?? ""));

    const [duplicate] = await db
      .select({ id: technicians.id })
      .from(technicians)
      .where(eq(technicians.username, username))
      .limit(1);
    if (duplicate) throw new Error("Username is already in use.");

    const passwordHash = await hashPassword(password);
    const [created] = await db.transaction(async (tx) => {
      const accounts = await tx
        .insert(technicians)
        .values({ name, username, passwordHash, role, divisionId })
        .returning({ id: technicians.id });
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "account.created",
        entityType: "technician",
        entityId: accounts[0].id,
        metadata: { role },
      });
      return accounts;
    });
    revalidatePath("/accounts");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error("Unable to create account.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create account.",
    };
  }
}

export async function updateAccountAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const currentUser = await requireAdministrator("account.update");
  try {
    if (!validAccountId(id)) throw new Error("Account ID is invalid.");
    const role = formValue(formData, "role", 20) as AccountRole;
    if (!accountRoles.includes(role)) throw new Error("Account role is invalid.");
    if (id === currentUser.id && role !== "administrator") {
      await recordAuthorizationDenied(currentUser, "account.update", { reason: "self_role_change" });
      throw new Error("Your account must remain an administrator.");
    }
    const divisionId = await validatedDivisionId(role, String(formData.get("divisionId") ?? ""));
    const activeValue = String(formData.get("isActive") ?? "");
    if (activeValue !== "true" && activeValue !== "false") {
      throw new Error("The account status is invalid.");
    }
    const isActive = activeValue === "true";
    if (id === currentUser.id && !isActive) {
      await recordAuthorizationDenied(currentUser, "account.update", { reason: "self_deactivation" });
      throw new Error("You cannot deactivate your own account.");
    }

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(technicians)
        .set({ role, divisionId, isActive, updatedAt: new Date() })
        .where(eq(technicians.id, id))
        .returning({ id: technicians.id });
      if (!updated) throw new Error("Account was not found.");
      if (!isActive) await tx.delete(authSessions).where(eq(authSessions.technicianId, id));
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "account.updated",
        entityType: "technician",
        entityId: id,
        metadata: { role, divisionId, isActive },
      });
    });
    revalidatePath("/");
    revalidatePath("/accounts");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to update account.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update account.",
    };
  }
}

export async function resetAccountPasswordAction(
  id: string,
  password: string,
): Promise<ActionResult> {
  const currentUser = await requireAdministrator("account.password_reset");
  try {
    if (!validAccountId(id)) throw new Error("Account ID is invalid.");
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const accounts = await tx
        .update(technicians)
        .set({
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(technicians.id, id))
        .returning({ id: technicians.id });
      if (!accounts[0]) throw new Error("Account was not found.");
      await tx.delete(authSessions).where(eq(authSessions.technicianId, id));
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "account.password_reset",
        entityType: "technician",
        entityId: id,
      });
      return accounts;
    });
    revalidatePath("/accounts");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to reset account password.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to reset password.",
    };
  }
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  const currentUser = await requireAdministrator("account.delete");
  try {
    if (!validAccountId(id)) throw new Error("Account ID is invalid.");
    if (id === currentUser.id) {
      await recordAuthorizationDenied(currentUser, "account.delete", { reason: "self_delete" });
      throw new Error("You cannot delete your own account.");
    }

    await db.transaction(async (tx) => {
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: currentUser.id,
        action: "account.deleted",
        entityType: "technician",
        entityId: id,
      });
      const [deleted] = await tx
        .delete(technicians)
        .where(eq(technicians.id, id))
        .returning({ id: technicians.id });
      if (!deleted) throw new Error("Account was not found.");
    });
    revalidatePath("/accounts");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to delete account.", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete account.",
    };
  }
}

"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { hashPassword } from "@/auth/password";
import { db } from "@/db";
import { auditLogs, masterDivisions, technicians } from "@/db/schema";

export interface RegisterState {
  error: string;
}

function value(formData: FormData, name: string, maxLength: number) {
  const result = String(formData.get(name) ?? "").trim();
  if (!result || result.length > maxLength) throw new Error(`${name} is invalid.`);
  return result;
}

export async function registerRequesterAction(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  try {
    const username = value(formData, "username", 80).toLowerCase();
    const divisionId = value(formData, "divisionId", 36);
    const password = String(formData.get("password") ?? "");

    if (!/^[a-z0-9._-]{2,80}$/.test(username)) {
      throw new Error("Username may only contain lowercase letters, numbers, dots, underscores, or dashes.");
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(divisionId)) {
      throw new Error("Division is invalid.");
    }
    const [division] = await db
      .select({ id: masterDivisions.id })
      .from(masterDivisions)
      .where(eq(masterDivisions.id, divisionId))
      .limit(1);
    if (!division) throw new Error("Division not found.");
    if (password.length < 6 || password.length > 128) {
      throw new Error("Password must contain 6 to 128 characters.");
    }

    const [duplicate] = await db
      .select({ id: technicians.id })
      .from(technicians)
      .where(eq(technicians.username, username))
      .limit(1);
    if (duplicate) throw new Error("Username is already in use.");

    const passwordHash = await hashPassword(password);
    const [account] = await db.transaction(async (tx) => {
      const created = await tx
        .insert(technicians)
        .values({ name: username, username, passwordHash, role: "requester", divisionId: division.id })
        .returning({ id: technicians.id });
      await tx.insert(auditLogs).values({
        actorType: "system",
        action: "account.self_registered",
        entityType: "technician",
        entityId: created[0].id,
        metadata: { role: "requester", divisionId: division.id },
      });
      return created;
    });

    if (!account) throw new Error("The account could not be created.");
  } catch (error) {
    console.error("Unable to register requester account.", error);
    return { error: error instanceof Error ? error.message : "Account registration failed." };
  }
  redirect("/login?registered=1");
}

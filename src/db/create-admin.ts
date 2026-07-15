import "dotenv/config";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { hashPassword } from "../auth/password-core";
import { db, pool } from "./connection";
import { authSessions, technicians } from "./schema";

async function createOrResetAdmin() {
  const username = (process.argv[2] ?? "admin").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) {
    throw new Error(
      "Username must contain 3-80 lowercase letters, numbers, dots, underscores, or dashes.",
    );
  }

  const suppliedPassword =
    process.env.INITIAL_ADMIN_PASSWORD || process.argv[3] || undefined;
  const password = suppliedPassword ?? randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const [accountWithUsername] = await db
    .select({ id: technicians.id })
    .from(technicians)
    .where(eq(technicians.username, username))
    .limit(1);
  const [existingAdministrator] = accountWithUsername
    ? [accountWithUsername]
    : await db
        .select({ id: technicians.id })
        .from(technicians)
        .where(eq(technicians.role, "administrator"))
        .limit(1);

  const technicianId = await db.transaction(async (tx) => {
    if (existingAdministrator) {
      await tx
        .update(technicians)
        .set({
          username,
          passwordHash,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: now,
        })
        .where(eq(technicians.id, existingAdministrator.id));
      await tx
        .delete(authSessions)
        .where(eq(authSessions.technicianId, existingAdministrator.id));
      return existingAdministrator.id;
    }

    const [created] = await tx
      .insert(technicians)
      .values({
        name: "Administrator IT",
        username,
        passwordHash,
        role: "administrator",
      })
      .returning({ id: technicians.id });
    return created.id;
  });

  console.info(`Administrator account ready (${technicianId}).`);
  console.info(`Username: ${username}`);
  if (suppliedPassword) {
    console.info("Password: supplied by INITIAL_ADMIN_PASSWORD or CLI argument.");
  } else {
    console.info(`Temporary password: ${password}`);
    console.info("Store it securely; it will not be shown again.");
  }
}

createOrResetAdmin()
  .catch((error: unknown) => {
    console.error("Unable to create administrator account.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

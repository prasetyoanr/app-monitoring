import "dotenv/config";

import { eq } from "drizzle-orm";

import {
  encryptBackupCredential,
  isEncryptedBackupCredential,
} from "../security/backup-credentials";
import { db, pool } from "./connection";
import { backupUsers } from "./schema";

async function encryptExistingCredentials() {
  const rows = await db
    .select({ id: backupUsers.id, value: backupUsers.passwordInformation })
    .from(backupUsers);
  let updated = 0;

  for (const row of rows) {
    if (!row.value || isEncryptedBackupCredential(row.value)) continue;
    await db
      .update(backupUsers)
      .set({
        passwordInformation: encryptBackupCredential(row.value),
        updatedAt: new Date(),
      })
      .where(eq(backupUsers.id, row.id));
    updated += 1;
  }

  console.info(`Encrypted ${updated} existing backup credential record(s).`);
}

encryptExistingCredentials()
  .catch((error: unknown) => {
    console.error("Backup credential encryption failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

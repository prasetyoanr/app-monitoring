// Proves a backup can actually be restored: restores it into a throw-away database, checks
// that every table is present, compares row counts with the live database, then drops the
// scratch database. The live database is only read. Usage:
//   bun run db:restore-test            (latest backup)
//   bun run db:restore-test <file.dump>
import path from "node:path";

import {
  chooseBackupFile,
  connect,
  migrationCount,
  printComparison,
  quote,
  tableCounts,
  verifyChecksum,
} from "./lib/restore-common.mjs";
import { connectionEnv, findPgTool, loadEnvironment, parseDatabaseUrl, run } from "./lib/pg-tools.mjs";

async function main() {
  const connection = parseDatabaseUrl(loadEnvironment());
  const directory = path.resolve(process.env.BACKUP_DIR || "storage/database-backups");
  const file = await chooseBackupFile(process.argv[2], directory, connection.database);
  console.log(`Testing restore of ${file}`);
  await verifyChecksum(file);

  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const scratch = `restore_test_${stamp}`;
  if (scratch === connection.database) throw new Error("Refusing to restore over the live database.");

  const admin = await connect(connection, "postgres");
  let created = false;
  const problems = [];
  try {
    await admin.query(`create database ${quote(scratch)}`);
    created = true;
    console.log(`Created scratch database ${scratch}; restoring ...`);
    await run(
      findPgTool("pg_restore"),
      [
        "--no-owner",
        // The target is always a brand-new database. Dumps from other servers carry their own
        // `CREATE SCHEMA public`, which would clash with the empty one; --clean replaces it.
        "--clean",
        "--if-exists",
        "--exit-on-error",
        "--host", connection.host,
        "--port", connection.port,
        "--username", connection.user,
        "--dbname", scratch,
        file,
      ],
      connectionEnv(connection, scratch),
    );

    const restored = await connect(connection, scratch);
    const live = await connect(connection, connection.database);
    try {
      const missing = printComparison(await tableCounts(restored), await tableCounts(live));
      for (const table of missing) problems.push(`table ${table} is missing from the backup`);
      console.log(`\nMigrations recorded: restored ${await migrationCount(restored)}, live ${await migrationCount(live)}`);
    } finally {
      await restored.end();
      await live.end();
    }
  } catch (error) {
    problems.push(String(error.message ?? error));
  } finally {
    if (created && scratch.startsWith("restore_test_")) {
      await admin
        .query(`drop database if exists ${quote(scratch)} with (force)`)
        .catch((error) => console.error(`Could not drop ${scratch}: ${error.message}`));
      console.log(`Dropped scratch database ${scratch}.`);
    }
    await admin.end();
  }

  if (problems.length) {
    console.error(`\nRESTORE TEST FAILED:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nRESTORE TEST PASSED: the backup restores and contains every table.");
}

main().catch((error) => {
  console.error(`RESTORE TEST FAILED: ${error.message}`);
  process.exit(1);
});

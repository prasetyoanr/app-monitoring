// Restores a backup into a NEW database and keeps it, so it can be inspected or switched to.
// The live database is only read; this script never overwrites an existing database.
//   bun run db:restore -- --to db_monitoring_restored            (newest backup)
//   bun run db:restore -- --to db_monitoring_restored --file path/to/file.dump
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

function readArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--to" || flag === "--file") values[flag.slice(2)] = argv[(index += 1)];
    else throw new Error(`Unknown argument: ${flag}. Use --to <new_database> [--file <backup.dump>].`);
  }
  return values;
}

async function main() {
  const { to: target, file: explicitFile } = readArguments(process.argv.slice(2));
  if (!target) throw new Error("Choose a name for the new database: --to <new_database>.");
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(target)) {
    throw new Error("The new database name must be 3-63 characters: lowercase letters, digits and underscores, starting with a letter.");
  }

  const connection = parseDatabaseUrl(loadEnvironment());
  if (target === connection.database) throw new Error("Refusing to restore over the live database. Choose a new name.");
  const directory = path.resolve(process.env.BACKUP_DIR || "storage/database-backups");
  const file = await chooseBackupFile(explicitFile, directory, connection.database);
  console.log(`Restoring ${file}`);
  await verifyChecksum(file);

  const admin = await connect(connection, "postgres");
  let created = false;
  try {
    const exists = await admin.query("select 1 from pg_database where datname = $1", [target]);
    if (exists.rowCount) throw new Error(`Database "${target}" already exists. Choose another name or drop it yourself first.`);
    await admin.query(`create database ${quote(target)}`);
    created = true;
    console.log(`Created database ${target}; restoring ...`);
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
        "--dbname", target,
        file,
      ],
      connectionEnv(connection, target),
    );
  } catch (error) {
    // A half-restored database is worse than none; remove only the one this run created.
    if (created) {
      await admin.query(`drop database if exists ${quote(target)} with (force)`).catch(() => undefined);
      console.error(`Removed the incomplete database ${target}.`);
    }
    throw error;
  } finally {
    await admin.end();
  }

  const restored = await connect(connection, target);
  const live = await connect(connection, connection.database);
  let missing;
  try {
    missing = printComparison(await tableCounts(restored), await tableCounts(live));
    console.log(`\nMigrations recorded: restored ${await migrationCount(restored)}, live ${await migrationCount(live)}`);
  } finally {
    await restored.end();
    await live.end();
  }
  if (missing.length) throw new Error(`The restore finished but these tables are missing: ${missing.join(", ")}.`);

  console.log(`
RESTORE DONE: database "${target}" is ready. The live database "${connection.database}" was not changed.

To switch the application to it:
  1. Stop the application.
  2. In .env, change the database name at the end of DATABASE_URL to ${target}.
  3. Keep the same BACKUP_CREDENTIAL_ENCRYPTION_KEY that was used when the backup was made.
  4. Run: bun run db:migrate   (only if the application is newer than the backup)
  5. Start the application and check a recent ticket, then drop the old database when sure.`);
}

main().catch((error) => {
  console.error(`RESTORE FAILED: ${error.message}`);
  process.exit(1);
});

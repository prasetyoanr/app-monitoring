// Full PostgreSQL backup: pg_dump (custom format) -> integrity check -> checksum ->
// optional second copy -> retention. Run `bun run db:backup`, or schedule it (see
// docs/backup-restore.md). Exits non-zero on any failure so a scheduler can alert.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { backupFileName, selectBackupsToKeep } from "./lib/backup-retention.mjs";
import { connectionEnv, findPgTool, loadEnvironment, parseDatabaseUrl, run } from "./lib/pg-tools.mjs";

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

async function main() {
  const connection = parseDatabaseUrl(loadEnvironment());
  const directory = path.resolve(process.env.BACKUP_DIR || "storage/database-backups");
  const keepDaily = Number(process.env.BACKUP_KEEP_DAILY || 14);
  const keepWeekly = Number(process.env.BACKUP_KEEP_WEEKLY || 8);
  await mkdir(directory, { recursive: true });

  const fileName = backupFileName(connection.database);
  const finalPath = path.join(directory, fileName);
  const partialPath = `${finalPath}.partial`;

  try {
    console.log(`Backing up "${connection.database}" on ${connection.host}:${connection.port} ...`);
    await run(
      findPgTool("pg_dump"),
      [
        "--format=custom",
        "--no-owner",
        "--host", connection.host,
        "--port", connection.port,
        "--username", connection.user,
        "--file", partialPath,
        connection.database,
      ],
      connectionEnv(connection),
    );

    // A dump that cannot be listed back is not a usable backup.
    const listing = await run(findPgTool("pg_restore"), ["--list", partialPath], process.env);
    const entries = listing.stdout.split("\n").filter((line) => line && !line.startsWith(";")).length;
    const { size } = await stat(partialPath);
    if (size === 0 || entries === 0) throw new Error("The dump is empty or unreadable; it was not kept.");

    const checksum = await sha256(partialPath);
    await rename(partialPath, finalPath);
    await writeFile(`${finalPath}.sha256`, `${checksum}  ${fileName}\n`);

    const copyDirectory = process.env.BACKUP_COPY_DIR ? path.resolve(process.env.BACKUP_COPY_DIR) : "";
    if (copyDirectory) {
      await mkdir(copyDirectory, { recursive: true });
      await copyFile(finalPath, path.join(copyDirectory, fileName));
      await copyFile(`${finalPath}.sha256`, path.join(copyDirectory, `${fileName}.sha256`));
    }

    // Retention only touches files that follow this script's own naming pattern.
    for (const dir of copyDirectory ? [directory, copyDirectory] : [directory]) {
      const { remove } = selectBackupsToKeep(await readdir(dir), connection.database, {
        daily: keepDaily,
        weekly: keepWeekly,
      });
      for (const old of remove) {
        await rm(path.join(dir, old), { force: true });
        await rm(path.join(dir, `${old}.sha256`), { force: true });
      }
      if (remove.length) console.log(`Removed ${remove.length} old backup(s) from ${dir}.`);
    }

    await writeFile(
      path.join(directory, "backup-status.json"),
      JSON.stringify(
        {
          ok: true,
          at: new Date().toISOString(),
          file: fileName,
          bytes: size,
          sha256: checksum,
          tocEntries: entries,
          copiedTo: copyDirectory || null,
        },
        null,
        2,
      ),
    );
    console.log(`OK  ${finalPath}  (${(size / 1024).toFixed(0)} KB, ${entries} objects, sha256 ${checksum.slice(0, 12)}...)`);
    if (!copyDirectory) console.log("Note: no BACKUP_COPY_DIR set, so this backup only exists on this machine.");
  } catch (error) {
    await rm(partialPath, { force: true });
    await writeFile(
      path.join(directory, "backup-status.json"),
      JSON.stringify({ ok: false, at: new Date().toISOString(), error: String(error.message ?? error) }, null, 2),
    ).catch(() => undefined);
    throw error;
  }
}

main().catch((error) => {
  console.error(`BACKUP FAILED: ${error.message}`);
  process.exit(1);
});

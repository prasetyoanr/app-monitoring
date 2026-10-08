import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import pg from "pg";

import { parseBackupName } from "./backup-retention.mjs";

export const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

export async function connect(connection, database) {
  const client = new pg.Client({
    host: connection.host,
    port: Number(connection.port),
    user: connection.user,
    password: connection.password,
    database,
  });
  await client.connect();
  return client;
}

export async function tableCounts(client) {
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name",
  );
  const counts = new Map();
  for (const { table_name: table } of rows) {
    const result = await client.query(`select count(*)::bigint as n from public.${quote(table)}`);
    counts.set(table, Number(result.rows[0].n));
  }
  return counts;
}

export async function migrationCount(client) {
  const result = await client
    .query("select count(*)::int as n from drizzle.__drizzle_migrations")
    .catch(() => ({ rows: [{ n: null }] }));
  return result.rows[0].n;
}

// An explicit file wins; otherwise the newest backup of this database, by the timestamp in
// its name (not the file's modified date, which changes when a file is copied).
export async function chooseBackupFile(explicit, directory, database) {
  if (explicit) return path.resolve(explicit);
  const names = (await readdir(directory))
    .map((name) => parseBackupName(name, database))
    .filter(Boolean)
    .sort((a, b) => b.date - a.date);
  if (!names.length) {
    throw new Error(`No backups named ${database}-YYYYMMDD-HHMMSS.dump in ${directory}. Run the backup first.`);
  }
  return path.join(directory, names[0].name);
}

export async function verifyChecksum(file) {
  const expected = (await readFile(`${file}.sha256`, "utf8").catch(() => "")).split(/\s+/)[0];
  if (!expected) {
    console.log("No .sha256 file next to the backup; skipping checksum.");
    return;
  }
  const actual = createHash("sha256").update(await readFile(file)).digest("hex");
  if (actual !== expected) {
    throw new Error("Checksum mismatch: the backup file was changed or damaged after it was written.");
  }
  console.log("Checksum OK.");
}

// Prints restored vs live row counts and returns the tables missing from the restore.
export function printComparison(restoredCounts, liveCounts) {
  const missing = [];
  console.log(`\n${"Table".padEnd(40)}${"restored".padStart(10)}${"live now".padStart(10)}`);
  for (const [table, liveRows] of liveCounts) {
    const restoredRows = restoredCounts.get(table);
    if (restoredRows === undefined) missing.push(table);
    const note =
      restoredRows === undefined
        ? "  MISSING"
        : restoredRows > liveRows
          ? "  (more than live: rows deleted since the backup)"
          : "";
    console.log(`${`  ${table}`.padEnd(40)}${String(restoredRows ?? "-").padStart(10)}${String(liveRows).padStart(10)}${note}`);
  }
  return missing;
}

import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env", quiet: true });
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("This activation script is restricted to a local database.");
const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
const expected = ["20260924042450_ga_management", "20260924042831_ga_administrative_resolution", "20260924065252_ga_receiving_index"];
// Identity fields are stable during normal work; operational status may change
// concurrently while the local app is open.
const fingerprint = async () => (await client.query(`SELECT count(*)::int AS total,
  md5(coalesce(string_agg(jsonb_build_object('id', id, 'created_at', created_at, 'source', source, 'requester_id', requester_id)::text, '' ORDER BY id), '')) AS checksum
  FROM troubleshooting_issues i`)).rows[0];
const pgBin = process.env.PG_BIN ?? "C:/Program Files/PostgreSQL/18/bin";
function run(executable, args, env = process.env) {
  const result = spawnSync(executable, args, { env, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr ?? "Command failed");
  return result.stdout;
}
try {
  await client.connect();
  const applied = new Set((await client.query("select name from drizzle.__drizzle_migrations")).rows.map((row) => row.name));
  const folders = await readdir("drizzle", { withFileTypes: true });
  const pending = [];
  for (const entry of folders) {
    if (entry.isDirectory() && /^\d{14}_/.test(entry.name) && !applied.has(entry.name) && await stat(path.join("drizzle", entry.name, "migration.sql")).then(() => true, () => false)) pending.push(entry.name);
  }
  pending.sort();
  if (!pending.length) { console.log("GA migrations already applied."); }
  else {
    if (pending.some((name) => !expected.includes(name))) throw new Error(`Unrelated migrations require review: ${pending.join(", ")}`);
    const before = await fingerprint();
    const backupDir = path.resolve("storage/database-backups");
    await mkdir(backupDir, { recursive: true });
    const backup = path.join(backupDir, `before-ga-management-${Date.now()}.dump`);
    const pgEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
    run(path.join(pgBin, "pg_dump.exe"), ["--format=custom", "--file", backup], pgEnv);
    const archive = run(path.join(pgBin, "pg_restore.exe"), ["--list", backup]);
    if (!(await stat(backup)).size || !archive.includes("troubleshooting_issues")) throw new Error("Backup verification failed.");
    console.log(`Verified backup: ${backup}`);
    console.log(run(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "migrate"]));
    const after = await fingerprint();
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Existing issue identities changed. Inspect the verified backup before continuing.");
    console.log(`Migrated safely: ${after.total} existing issue identities preserved.`);
  }
} finally { await client.end(); }

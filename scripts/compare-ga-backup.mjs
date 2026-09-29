import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env", quiet: true });
const sourceUrl = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(sourceUrl.hostname)) throw new Error("Local database only.");
const backup = process.argv[2];
if (!backup) throw new Error("Pass the verified .dump path.");
const temporaryDatabase = "ga_management_verify_20260924";
const adminUrl = new URL(sourceUrl); adminUrl.pathname = "/postgres";
const restoreUrl = new URL(sourceUrl); restoreUrl.pathname = `/${temporaryDatabase}`;
const admin = new Client({ connectionString: adminUrl.toString() });
const source = new Client({ connectionString: sourceUrl.toString() });
const query = `SELECT count(*)::int AS total,
  md5(coalesce(string_agg((to_jsonb(i) - 'receiving_division_id')::text, '' ORDER BY id), '')) AS checksum
  FROM troubleshooting_issues i`;
await admin.connect();
try {
  await admin.query(`DROP DATABASE IF EXISTS ${temporaryDatabase} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${temporaryDatabase}`);
  const pgRestore = process.env.PG_RESTORE ?? "C:/Program Files/PostgreSQL/18/bin/pg_restore.exe";
  const restored = spawnSync(pgRestore, ["--no-owner", "--no-privileges", "--dbname", restoreUrl.toString(), backup], { encoding: "utf8", windowsHide: true });
  if (restored.status !== 0) throw new Error(restored.stderr || "Restore failed.");
  const restoredClient = new Client({ connectionString: restoreUrl.toString() });
  await source.connect(); await restoredClient.connect();
  try {
    const before = (await restoredClient.query(query)).rows[0];
    const after = (await source.query(query)).rows[0];
    const beforeRows = (await restoredClient.query(`select id, to_jsonb(i) - 'receiving_division_id' as row from troubleshooting_issues i order by id`)).rows;
    const afterRows = (await source.query(`select id, to_jsonb(i) - 'receiving_division_id' as row from troubleshooting_issues i order by id`)).rows;
    const afterById = new Map(afterRows.map((row) => [row.id, row.row]));
    const differences = [];
    for (const oldRow of beforeRows) {
      const newRow = afterById.get(oldRow.id);
      const fields = new Set([...Object.keys(oldRow.row), ...Object.keys(newRow ?? {})]);
      const changed = [...fields].filter((field) => JSON.stringify(oldRow.row[field]) !== JSON.stringify(newRow?.[field]));
      if (changed.length) differences.push({ id: oldRow.id, changed, before: Object.fromEntries(changed.map((field) => [field, oldRow.row[field]])), after: Object.fromEntries(changed.map((field) => [field, newRow?.[field]])) });
    }
    console.log(JSON.stringify({ before, after, equal: JSON.stringify(before) === JSON.stringify(after), differences }));
  } finally { await source.end(); await restoredClient.end(); }
} finally {
  await admin.query(`DROP DATABASE IF EXISTS ${temporaryDatabase} WITH (FORCE)`);
  await admin.end();
}

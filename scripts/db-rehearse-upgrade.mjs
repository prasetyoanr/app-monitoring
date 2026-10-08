// Rehearses upgrading a production dump to the current application version, without
// touching any real database: restore the dump into a scratch database, run the migrations
// on it, then check that no rows were lost and the data meets the new rules.
//   bun run db:rehearse-upgrade -- --file path/to/production.dump [--keep]
// The scratch database (prodcopy_<time>) is dropped afterwards unless --keep is given.
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { connect, migrationCount, quote, tableCounts } from "./lib/restore-common.mjs";
import { connectionEnv, findPgTool, loadEnvironment, parseDatabaseUrl, run } from "./lib/pg-tools.mjs";

function readArguments(argv) {
  const values = { keep: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--file") values.file = argv[(index += 1)];
    else if (flag === "--keep") values.keep = true;
    else throw new Error(`Unknown argument: ${flag}. Use --file <production.dump> [--keep].`);
  }
  return values;
}

function repositoryMigrationCount() {
  const root = path.resolve("drizzle");
  return readdirSync(root, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && existsSync(path.join(root, entry.name, "migration.sql")),
  ).length;
}

async function scalar(client, sql) {
  return (await client.query(sql)).rows[0]?.n ?? null;
}

async function main() {
  const { file: dumpArgument, keep } = readArguments(process.argv.slice(2));
  if (!dumpArgument) throw new Error("Give the production dump: --file <production.dump>.");
  const file = path.resolve(dumpArgument);
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);

  const databaseUrl = loadEnvironment();
  const connection = parseDatabaseUrl(databaseUrl);
  const scratch = `prodcopy_${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  if (scratch === connection.database) throw new Error("Refusing to use the live database.");

  const problems = [];
  const notes = [];
  const admin = await connect(connection, "postgres");
  let created = false;
  try {
    await admin.query(`create database ${quote(scratch)}`);
    created = true;
    console.log(`1/4 Restoring ${path.basename(file)} into scratch database ${scratch} ...`);
    await run(
      findPgTool("pg_restore"),
      [
        "--no-owner", "--clean", "--if-exists", "--exit-on-error",
        "--host", connection.host, "--port", connection.port, "--username", connection.user,
        "--dbname", scratch, file,
      ],
      connectionEnv(connection, scratch),
    );

    const before = await connect(connection, scratch);
    const beforeCounts = await tableCounts(before);
    const beforeMigrations = await migrationCount(before);
    // If the id counter is behind the highest recorded id, the next migration cannot be
    // recorded ("duplicate key") and the upgrade stops half way.
    const counter = (await before.query(
      "select (select max(id) from drizzle.__drizzle_migrations) as max_id, (select last_value from drizzle.__drizzle_migrations_id_seq) as seq",
    )).rows[0];
    if (counter.max_id !== null && Number(counter.seq) < Number(counter.max_id)) {
      problems.push(`the migrations id counter (${counter.seq}) is behind the highest recorded id (${counter.max_id}); fix it with: select setval('drizzle.__drizzle_migrations_id_seq', (select max(id) from drizzle.__drizzle_migrations));`);
    }
    await before.end();
    console.log(`    restored: ${beforeCounts.size} tables, ${beforeMigrations} migrations applied.`);

    console.log("2/4 Running migrations on the scratch copy ...");
    const url = new URL(databaseUrl);
    url.pathname = `/${scratch}`;
    const migrate = spawnSync(process.execPath, [path.resolve("node_modules/drizzle-kit/bin.cjs"), "migrate"], {
      env: { ...process.env, DATABASE_URL: url.toString() },
      encoding: "utf8",
    });
    if (migrate.status !== 0) {
      const text = `${migrate.stdout ?? ""}${migrate.stderr ?? ""}`.split(url.password).join("***");
      throw new Error(`Migration failed:\n${text.slice(-1500)}`);
    }

    console.log("3/4 Checking the upgraded copy ...");
    const after = await connect(connection, scratch);
    try {
      const afterCounts = await tableCounts(after);
      const afterMigrations = await migrationCount(after);
      const expected = repositoryMigrationCount();
      if (afterMigrations !== expected) problems.push(`migrations recorded ${afterMigrations}, but the application ships ${expected}`);

      console.log(`\n${"Table".padEnd(36)}${"before".padStart(9)}${"after".padStart(9)}`);
      for (const [table, rowsBefore] of beforeCounts) {
        const rowsAfter = afterCounts.get(table);
        const lost = rowsAfter === undefined || rowsAfter < rowsBefore;
        if (lost) problems.push(`table ${table}: ${rowsBefore} rows before, ${rowsAfter ?? "missing"} after`);
        console.log(`${`  ${table}`.padEnd(36)}${String(rowsBefore).padStart(9)}${String(rowsAfter ?? "-").padStart(9)}${lost ? "  <-- ROWS LOST" : ""}`);
      }
      const added = [...afterCounts.keys()].filter((table) => !beforeCounts.has(table));
      if (added.length) notes.push(`new tables created by the migrations: ${added.join(", ")}`);

      const issues = await scalar(after, "select count(*)::int n from troubleshooting_issues");
      const withDivision = await scalar(after, "select count(service_division_id)::int n from troubleshooting_issues");
      if (issues !== withDivision) problems.push(`${issues - withDivision} ticket(s) have no service division`);
      const noSlug = await scalar(after, "select count(*)::int n from master_divisions where slug is null");
      if (noSlug) problems.push(`${noSlug} division(s) have no slug`);

      const gaDivisions = (await after.query("select name, is_ga_unit from master_divisions where slug in ('ga', 'general-affair', 'general-affairs')")).rows;
      if (!gaDivisions.length) problems.push("no General Affairs division was found (slug ga / general-affair)");
      for (const division of gaDivisions) {
        if (!division.is_ga_unit) problems.push(`division "${division.name}" is not flagged as a GA unit, so its staff would not appear in GA Activities`);
      }
      const accounts = (await after.query("select username, role from technicians order by username")).rows;
      notes.push(`accounts after upgrade: ${accounts.map((row) => `${row.username} (${row.role})`).join(", ") || "none"}`);
      const noUsername = await scalar(after, "select count(*)::int n from technicians where username is null");
      if (noUsername) problems.push(`${noUsername} account(s) have no username and cannot log in`);
      const photos = await scalar(after, "select count(*) filter (where work_photo_data is not null)::int n from troubleshooting_issues");
      const signatures = await scalar(after, "select count(*) filter (where signature_data is not null)::int n from troubleshooting_approvals");
      notes.push(`tickets: ${issues}, work photos: ${photos}, signatures: ${signatures}`);
    } finally {
      await after.end();
    }
  } catch (error) {
    problems.push(String(error.message ?? error));
  } finally {
    if (created && scratch.startsWith("prodcopy_")) {
      if (keep) {
        console.log(`\nKept scratch database ${scratch} (drop it when you are done).`);
      } else {
        await admin
          .query(`drop database if exists ${quote(scratch)} with (force)`)
          .catch((error) => console.error(`Could not drop ${scratch}: ${error.message}`));
        console.log(`\n4/4 Dropped scratch database ${scratch}.`);
      }
    }
    await admin.end();
  }

  for (const note of notes) console.log(`- ${note}`);
  if (problems.length) {
    console.error(`\nREHEARSAL FAILED:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nREHEARSAL PASSED: the dump upgrades cleanly and no rows were lost.");
}

main().catch((error) => {
  console.error(`REHEARSAL FAILED: ${error.message}`);
  process.exit(1);
});

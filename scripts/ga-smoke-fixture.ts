// Temporary local-only accounts and tickets for authenticated browser acceptance.
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { Client } from "pg";
import { hashPassword } from "../src/auth/password-core";

config({ path: ".env", quiet: true });
async function main() {
const url = new URL(process.env.DATABASE_URL!);
if (url.hostname !== "localhost") throw new Error("Local database only.");
const client = new Client({ connectionString: url.toString() });
const prefix = "codex.ga.smoke.20260924.";
const roles = ["requester", "receptionist", "service_agent", "approver", "final_approver"] as const;
await client.connect();
try {
  await client.query("BEGIN");
  const existing = (await client.query("select id, username from technicians where username = ANY($1::text[])", [roles.map((role) => prefix + role)])).rows;
  if (process.argv.includes("--cleanup")) {
    const ids = existing.map((row) => row.id);
    const tickets = (await client.query("select id from troubleshooting_issues where requester_id = ANY($1::uuid[])", [ids])).rows.map((row) => row.id);
    await client.query("delete from audit_logs where actor_id = ANY($1::text[]) or (entity_type = 'troubleshooting_issue' and entity_id = ANY($2::text[]))", [ids, tickets]);
    await client.query("delete from troubleshooting_issues where id = ANY($1::text[])", [tickets]);
    await client.query("delete from technicians where id = ANY($1::uuid[])", [ids]);
    console.log(JSON.stringify({ removedTestAccounts: ids.length, removedTestTickets: tickets.length }));
  } else {
    if (existing.length) throw new Error("Fixture already exists; do not overwrite accounts.");
    const divisions = (await client.query("select id, slug from master_divisions where slug = ANY($1::text[])", [["ga", "it-team", "marketing"]])).rows;
    const idFor = (slug: string) => divisions.find((row) => row.slug === slug)?.id;
    if (!idFor("ga") || !idFor("it-team") || !idFor("marketing")) throw new Error("Required test divisions unavailable.");
    const password = randomBytes(18).toString("base64url");
    const passwordHash = await hashPassword(password);
    for (const role of roles) {
      await client.query("insert into technicians (name,username,password_hash,role,division_id) values ($1,$2,$3,$4,$5)", ["GA Smoke " + role, prefix + role, passwordHash, role, role === "requester" ? idFor("marketing") : role === "service_agent" ? idFor("it-team") : null]);
    }
    console.log(JSON.stringify({ password, usernames: roles.map((role) => prefix + role) }));
  }
  await client.query("COMMIT");
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { await client.end(); }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });

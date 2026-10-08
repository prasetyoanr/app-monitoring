import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

export function loadEnvironment() {
  config({ path: path.resolve(process.cwd(), ".env"), quiet: true });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (checked the environment and .env).");
  return url;
}

// Splits the connection string so the password travels through PGPASSWORD instead of the
// command line, where other users on the machine could read it from the process list.
export function parseDatabaseUrl(value) {
  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL does not name a database.");
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

export function connectionEnv(connection, database = connection.database) {
  return { ...process.env, PGPASSWORD: connection.password, PGDATABASE: database };
}

// pg_dump must be at least as new as the server. Honour PG_BIN first, then PATH, then the
// default Windows install folders (highest version wins).
export function findPgTool(name) {
  const exe = process.platform === "win32" ? `${name}.exe` : name;
  const candidates = [];
  if (process.env.PG_BIN) candidates.push(path.join(process.env.PG_BIN, exe));
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (dir) candidates.push(path.join(dir, exe));
  }
  if (process.platform === "win32") {
    const root = path.join(process.env.ProgramFiles ?? "C:\Program Files", "PostgreSQL");
    if (existsSync(root)) {
      const versions = readdirSync(root).filter((entry) => /^\d+$/.test(entry)).sort((a, b) => Number(b) - Number(a));
      for (const version of versions) candidates.push(path.join(root, version, "bin", exe));
    }
  }
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Could not find ${exe}. Install the PostgreSQL client tools or set PG_BIN to the folder that contains it.`);
  }
  return found;
}

export function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, windowsHide: true });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(command)} exited with code ${code}.\n${stderr.trim()}`));
    });
  });
}

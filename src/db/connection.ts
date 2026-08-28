import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalForDatabase = globalThis as typeof globalThis & {
  appDatabasePool?: Pool;
};

function createDatabasePool() {
  const databasePool = new Pool({
    connectionString,
    // Development navigation starts several Server Component queries at once.
    // Two reusable connections avoid a burst of concurrent authentication while
    // keeping these small local queries responsive.
    max: process.env.NODE_ENV === "production" ? 10 : 2,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    application_name: "oneservice",
  });

  // pg emits idle connection failures as pool errors. Handling the event keeps
  // a temporary disconnect from terminating the development server process.
  databasePool.on("error", (error) => {
    console.error("PostgreSQL idle connection error", {
      message: error.message,
      code: "code" in error ? error.code : undefined,
    });
  });

  return databasePool;
}

export const pool =
  globalForDatabase.appDatabasePool ??
  createDatabasePool();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.appDatabasePool = pool;
}

export const db = drizzle({ client: pool });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalForDatabase = globalThis as typeof globalThis & {
  appMonitoringPool?: Pool;
};

export const pool =
  globalForDatabase.appMonitoringPool ??
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.appMonitoringPool = pool;
}

export const db = drizzle({ client: pool });

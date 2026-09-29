import "server-only";

import path from "node:path";

import { readMigrationFiles } from "drizzle-orm/migrator";
import type { QueryResultRow } from "pg";

import packageJson from "../../package.json";
import { requireAdministrator } from "@/auth/session";
import { pool } from "@/db/connection";

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export interface HealthCheck {
  id: "database" | "storage" | "migrations" | "runtime" | "version";
  label: string;
  status: HealthStatus;
  value: string;
  detail: string;
  responseTimeMs?: number;
}

export interface SystemHealthReport {
  overallStatus: HealthStatus;
  checkedAt: string;
  checks: HealthCheck[];
}

async function healthQuery<Row extends QueryResultRow>(text: string) {
  const client = await pool.connect();
  try {
    await client.query("begin read only");
    await client.query("set local statement_timeout = 3000");
    return await client.query<Row>(text);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function databaseCheck(): Promise<HealthCheck> {
  const startedAt = performance.now();
  try {
    await healthQuery("select 1 as ok");
    const responseTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
    return {
      id: "database",
      label: "Database",
      status: responseTimeMs > 1_500 ? "warning" : "healthy",
      value: responseTimeMs > 1_500 ? "Slow" : "Connected",
      detail: responseTimeMs > 1_500
        ? "PostgreSQL responded, but more slowly than expected."
        : "PostgreSQL is responding normally.",
      responseTimeMs,
    };
  } catch {
    return {
      id: "database",
      label: "Database",
      status: "critical",
      value: "Unavailable",
      detail: "The application could not complete a database health query.",
    };
  }
}

async function storageCheck(): Promise<HealthCheck> {
  try {
    const result = await healthQuery<{ size_bytes: string }>(
      "select pg_database_size(current_database())::text as size_bytes",
    );
    const sizeBytes = Number(result.rows[0]?.size_bytes);
    return {
      id: "storage",
      label: "Data Storage",
      status: Number.isFinite(sizeBytes) ? "healthy" : "unknown",
      value: formatBytes(sizeBytes),
      detail: "Application records and uploaded images are stored in PostgreSQL.",
    };
  } catch {
    return {
      id: "storage",
      label: "Data Storage",
      status: "unknown",
      value: "Unavailable",
      detail: "Database storage usage could not be read with the current permissions.",
    };
  }
}

async function migrationCheck(): Promise<HealthCheck> {
  try {
    const localMigrations = readMigrationFiles({
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    if (localMigrations.length === 0) {
      return {
        id: "migrations",
        label: "Database Migrations",
        status: "unknown",
        value: "No local files",
        detail: "Migration files were not available in this application build.",
      };
    }

    const result = await healthQuery<{ created_at: string }>(
      "select created_at::text from drizzle.__drizzle_migrations order by created_at asc",
    );
    const applied = new Set(result.rows.map((row) => Number(row.created_at)));
    const local = new Set(localMigrations.map((migration) => migration.folderMillis));
    const pending = localMigrations.filter((migration) => !applied.has(migration.folderMillis));
    if (pending.length > 0) {
      return {
        id: "migrations",
        label: "Database Migrations",
        status: "warning",
        value: `${pending.length} pending`,
        detail: `Latest pending migration: ${pending.at(-1)?.name ?? "unknown"}.`,
      };
    }
    const unexpected = [...applied].filter((createdAt) => !local.has(createdAt));
    if (unexpected.length > 0) {
      return {
        id: "migrations",
        label: "Database Migrations",
        status: "warning",
        value: "Database ahead",
        detail: "The database contains migrations that are not included in this application build.",
      };
    }
    return {
      id: "migrations",
      label: "Database Migrations",
      status: "healthy",
      value: "Up to date",
      detail: `${localMigrations.length} application migrations are applied.`,
    };
  } catch {
    return {
      id: "migrations",
      label: "Database Migrations",
      status: "critical",
      value: "Unverified",
      detail: "The migration history table could not be verified.",
    };
  }
}

function overallStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.some((check) => check.status === "critical")) return "critical";
  if (checks.some((check) => check.status === "warning")) return "warning";
  if (checks.some((check) => check.status === "unknown")) return "unknown";
  return "healthy";
}

export async function getSystemHealth(): Promise<SystemHealthReport> {
  await requireAdministrator("system_health.view");

  const [database, storage, migrations] = await Promise.all([
    databaseCheck(),
    storageCheck(),
    migrationCheck(),
  ]);
  const checks: HealthCheck[] = [
    database,
    storage,
    migrations,
    {
      id: "runtime",
      label: "Application Runtime",
      status: "healthy",
      value: formatUptime(process.uptime()),
      detail: `Current server process · ${process.version}.`,
    },
    {
      id: "version",
      label: "Application Version",
      status: "healthy",
      value: `v${packageJson.version}`,
      detail: process.env.NODE_ENV === "production" ? "Production environment." : "Development environment.",
    },
  ];

  return {
    overallStatus: overallStatus(checks),
    checkedAt: new Date().toISOString(),
    checks,
  };
}

import "server-only";

import { and, count, eq, gt, gte, inArray, lt } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs, technicians, troubleshootingIssues } from "@/db/schema";
import { getSystemHealth, type HealthStatus } from "@/data/system-health";
import { buildAdminAlerts } from "@/lib/admin-alerts";

const HEALTH_CACHE_MS = 5 * 60 * 1000;
let healthCache: { checkedAt: number; status: HealthStatus } | null = null;

// The bell is rendered on every navigation, so the heavier system checks are reused for
// a few minutes instead of re-running each time.
async function cachedHealthStatus(): Promise<HealthStatus> {
  const now = Date.now();
  if (healthCache && now - healthCache.checkedAt < HEALTH_CACHE_MS) return healthCache.status;
  try {
    const status = (await getSystemHealth()).overallStatus;
    healthCache = { checkedAt: now, status };
    return status;
  } catch (error) {
    console.error("Unable to read system health for the notification bell.", error);
    return "unknown";
  }
}

// Only the administrator's bell calls this (the caller checks the role).
export async function getAdminAlerts() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 3 * 86_400_000);
  const loginWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [[stalled], [unassigned], [lockedAccounts], [failedLogins], health] = await Promise.all([
    db
      .select({ value: count() })
      .from(troubleshootingIssues)
      .where(and(
        inArray(troubleshootingIssues.status, ["New", "In Progress", "Waiting for Client Approval", "Reopened"]),
        lt(troubleshootingIssues.updatedAt, staleBefore),
      )),
    db
      .select({ value: count() })
      .from(troubleshootingIssues)
      .where(and(
        eq(troubleshootingIssues.workflowEnabled, true),
        eq(troubleshootingIssues.workflowStatus, "ready_for_assignment"),
      )),
    db.select({ value: count() }).from(technicians).where(gt(technicians.lockedUntil, now)),
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.action, "authentication.login_failed"),
        gte(auditLogs.createdAt, loginWindowStart),
      )),
    cachedHealthStatus(),
  ]);

  return buildAdminAlerts({
    stalled: stalled.value,
    unassigned: unassigned.value,
    lockedAccounts: lockedAccounts.value,
    failedLogins: failedLogins.value,
    health,
  });
}

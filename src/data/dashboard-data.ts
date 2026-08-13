import "server-only";

import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { backupUsers, troubleshootingIssues } from "@/db/schema";
import { jakartaDateInput } from "@/lib/jakarta-date";

export async function getDashboardData() {
  const currentUser = await requireAuthenticatedUser();
  const todayStart = new Date(`${jakartaDateInput()}T00:00:00+07:00`);
  const trendStart = new Date(todayStart.getTime() - 13 * 86_400_000);
  const trendDate = sql<string>`to_char(${troubleshootingIssues.reportedAt} at time zone 'Asia/Jakarta', 'YYYY-MM-DD')`;
  const requesterFilter = currentUser.role === "requester"
    ? eq(troubleshootingIssues.requesterId, currentUser.id)
    : undefined;

  const [issueCounts, backupCounts, recentIssues, trend] =
    await Promise.all([
      db
        .select({ status: troubleshootingIssues.status, total: count() })
        .from(troubleshootingIssues)
        .where(requesterFilter)
        .groupBy(troubleshootingIssues.status),
      db
        .select({ status: backupUsers.status, total: count() })
        .from(backupUsers)
        .groupBy(backupUsers.status),
      db
        .select({
          id: troubleshootingIssues.id,
          title: troubleshootingIssues.title,
          location: troubleshootingIssues.location,
          category: troubleshootingIssues.category,
          status: troubleshootingIssues.status,
          completedDays: troubleshootingIssues.completedDays,
        })
        .from(troubleshootingIssues)
        .where(requesterFilter)
        .orderBy(
          desc(troubleshootingIssues.reportedAt),
          desc(troubleshootingIssues.id),
        )
        .limit(4),
      db
        .select({ date: trendDate, total: count() })
        .from(troubleshootingIssues)
        .where(requesterFilter ? and(gte(troubleshootingIssues.reportedAt, trendStart), requesterFilter) : gte(troubleshootingIssues.reportedAt, trendStart))
        .groupBy(trendDate)
        .orderBy(trendDate),
    ]);

  const issueTotal = issueCounts.reduce((sum, row) => sum + row.total, 0);
  const completedIssues =
    issueCounts.find((row) => row.status === "Completed")?.total ?? 0;
  const visibleBackupCounts = currentUser.role === "administrator" ? backupCounts : [];
  const backupTotal = visibleBackupCounts.reduce((sum, row) => sum + row.total, 0);
  const backupSuccess =
    visibleBackupCounts.find((row) => row.status === "Success")?.total ?? 0;

  return {
    currentUser,
    activeIssues: issueTotal - completedIssues,
    completedIssues,
    backupTotal,
    backupSuccess,
    failedBackups:
      visibleBackupCounts.find((row) => row.status === "Failed")?.total ?? 0,
    overdueBackups:
      visibleBackupCounts.find((row) => row.status === "Overdue")?.total ?? 0,
    recentIssues,
    trend,
  };
}

import "server-only";

import { count, desc, gte, sql } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { backupUsers, troubleshootingIssues } from "@/db/schema";
import { jakartaDateInput } from "@/lib/jakarta-date";

export async function getDashboardData() {
  const todayStart = new Date(`${jakartaDateInput()}T00:00:00+07:00`);
  const trendStart = new Date(todayStart.getTime() - 13 * 86_400_000);
  const trendDate = sql<string>`to_char(${troubleshootingIssues.reportedAt} at time zone 'Asia/Jakarta', 'YYYY-MM-DD')`;

  const [currentUser, issueCounts, backupCounts, recentIssues, trend] =
    await Promise.all([
      requireAuthenticatedUser(),
      db
        .select({ status: troubleshootingIssues.status, total: count() })
        .from(troubleshootingIssues)
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
        .orderBy(
          desc(troubleshootingIssues.reportedAt),
          desc(troubleshootingIssues.id),
        )
        .limit(4),
      db
        .select({ date: trendDate, total: count() })
        .from(troubleshootingIssues)
        .where(gte(troubleshootingIssues.reportedAt, trendStart))
        .groupBy(trendDate)
        .orderBy(trendDate),
    ]);

  const issueTotal = issueCounts.reduce((sum, row) => sum + row.total, 0);
  const completedIssues =
    issueCounts.find((row) => row.status === "Completed")?.total ?? 0;
  const backupTotal = backupCounts.reduce((sum, row) => sum + row.total, 0);
  const backupSuccess =
    backupCounts.find((row) => row.status === "Success")?.total ?? 0;

  return {
    currentUser,
    activeIssues: issueTotal - completedIssues,
    completedIssues,
    backupTotal,
    backupSuccess,
    failedBackups:
      backupCounts.find((row) => row.status === "Failed")?.total ?? 0,
    overdueBackups:
      backupCounts.find((row) => row.status === "Overdue")?.total ?? 0,
    recentIssues,
    trend,
  };
}

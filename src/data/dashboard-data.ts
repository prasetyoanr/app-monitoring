import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { backupUsers, troubleshootingIssues } from "@/db/schema";

export async function getDashboardData() {
  const currentUser = await requireAuthenticatedUser();
  const divisionFilter =
    currentUser.role === "administrator"
      ? undefined
      : eq(troubleshootingIssues.division, currentUser.divisionName ?? "");

  const [issueCounts, backupCounts, recentIssues] =
    await Promise.all([
      db
        .select({ status: troubleshootingIssues.status, total: count() })
        .from(troubleshootingIssues)
        .where(divisionFilter)
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
        .where(divisionFilter)
        .orderBy(
          desc(troubleshootingIssues.reportedAt),
          desc(troubleshootingIssues.id),
        )
        .limit(4),
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
  };
}

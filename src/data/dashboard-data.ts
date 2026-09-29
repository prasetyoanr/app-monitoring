import "server-only";

import { and, count, desc, eq, gt, gte, inArray, lt } from "drizzle-orm";

import { isITRoleUser, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, backupUsers, technicians, troubleshootingIssues } from "@/db/schema";
import { serviceInboxScope } from "@/data/issue-scope";

export async function getDashboardData() {
  const currentUser = await requireAuthenticatedUser();
  const canAccessBackups = isITRoleUser(currentUser);
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 3 * 86_400_000);
  const securityWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const divisionFilter =
    currentUser.role === "requester"
      ? eq(troubleshootingIssues.division, currentUser.divisionName ?? "")
      : serviceInboxScope(currentUser);

  const adminControlPromise = currentUser.role === "administrator"
    ? Promise.all([
        db
          .select({ status: troubleshootingIssues.workflowStatus, total: count() })
          .from(troubleshootingIssues)
          .where(and(
            eq(troubleshootingIssues.workflowEnabled, true),
            inArray(troubleshootingIssues.workflowStatus, [
              "submitted",
              "needs_revision",
              "waiting_approver",
              "waiting_final_approver",
              "ready_for_assignment",
            ]),
          ))
          .groupBy(troubleshootingIssues.workflowStatus),
        db
          .select({ total: count() })
          .from(troubleshootingIssues)
          .where(
            and(
              inArray(troubleshootingIssues.status, [
                "New",
                "In Progress",
                "Waiting for Client Approval",
                "Reopened",
              ]),
              lt(troubleshootingIssues.updatedAt, staleBefore),
            ),
          ),
        db
          .select({ total: count() })
          .from(technicians)
          .where(gt(technicians.lockedUntil, now)),
        db
          .select({ action: auditLogs.action, total: count() })
          .from(auditLogs)
          .where(
            gte(auditLogs.createdAt, securityWindowStart),
          )
          .groupBy(auditLogs.action),
      ])
    : Promise.resolve(null);

  const [issueCounts, backupCounts, recentIssues, adminRows] =
    await Promise.all([
      db
        .select({ status: troubleshootingIssues.status, total: count() })
        .from(troubleshootingIssues)
        .where(divisionFilter)
        .groupBy(troubleshootingIssues.status),
      canAccessBackups ? db
        .select({ status: backupUsers.status, total: count() })
        .from(backupUsers)
        .groupBy(backupUsers.status) : Promise.resolve([]),
      db
        .select({
          id: troubleshootingIssues.id,
          title: troubleshootingIssues.title,
          location: troubleshootingIssues.location,
          category: troubleshootingIssues.category,
          status: troubleshootingIssues.status,
          workflowEnabled: troubleshootingIssues.workflowEnabled,
          workflowStatus: troubleshootingIssues.workflowStatus,
          completedDays: troubleshootingIssues.completedDays,
        })
        .from(troubleshootingIssues)
        .where(divisionFilter)
        .orderBy(
          desc(troubleshootingIssues.reportedAt),
          desc(troubleshootingIssues.id),
        )
        .limit(4),
      adminControlPromise,
    ]);

  const issueTotal = issueCounts.reduce((sum, row) => sum + row.total, 0);
  const completedIssues =
    issueCounts.find((row) => row.status === "Completed")?.total ?? 0;
  const visibleBackupCounts = canAccessBackups ? backupCounts : [];
  const backupTotal = visibleBackupCounts.reduce((sum, row) => sum + row.total, 0);
  const backupSuccess =
    visibleBackupCounts.find((row) => row.status === "Success")?.total ?? 0;
  const adminControl = adminRows
    ? {
        gaAdmin:
          (adminRows[0].find((row) => row.status === "submitted")?.total ?? 0) +
          (adminRows[0].find((row) => row.status === "needs_revision")?.total ?? 0),
        gaSupervisor:
          adminRows[0].find((row) => row.status === "waiting_approver")?.total ?? 0,
        seniorApprover:
          adminRows[0].find((row) => row.status === "waiting_final_approver")?.total ?? 0,
        unassigned:
          adminRows[0].find((row) => row.status === "ready_for_assignment")?.total ?? 0,
        stalled: adminRows[1][0]?.total ?? 0,
        lockedAccounts: adminRows[2][0]?.total ?? 0,
        failedLogins:
          adminRows[3].find((row) => row.action === "authentication.login_failed")?.total ?? 0,
        deniedAttempts:
          adminRows[3].find((row) => row.action === "authorization.denied")?.total ?? 0,
        sensitiveAccess:
          adminRows[3].find((row) => row.action === "sensitive_data.accessed")?.total ?? 0,
      }
    : null;

  return {
    currentUser,
    canAccessBackups,
    activeIssues: issueTotal - completedIssues,
    completedIssues,
    backupTotal,
    backupSuccess,
    failedBackups:
      visibleBackupCounts.find((row) => row.status === "Failed")?.total ?? 0,
    overdueBackups:
      visibleBackupCounts.find((row) => row.status === "Overdue")?.total ?? 0,
    recentIssues,
    adminControl,
  };
}

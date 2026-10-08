// Alerts shown in the administrator's notification bell. Unlike the task notifications other
// roles get, these describe conditions that exist right now, so they are derived from live
// counts and disappear on their own once the problem is resolved.

export type AdminAlertSeverity = "critical" | "warning";

export interface AdminAlert {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: AdminAlertSeverity;
}

export interface AdminAlertInput {
  stalled: number;
  unassigned: number;
  lockedAccounts: number;
  failedLogins: number;
  health: "healthy" | "warning" | "critical" | "unknown";
}

// A single mistyped password is not worth a bell; five matches the account lock threshold.
export const FAILED_LOGIN_ALERT_THRESHOLD = 5;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function buildAdminAlerts(input: AdminAlertInput): AdminAlert[] {
  const alerts: AdminAlert[] = [];

  if (input.health === "critical" || input.health === "warning") {
    alerts.push({
      id: "system-health",
      title: `System Health: ${input.health === "critical" ? "Critical" : "Warning"}`,
      description: "One or more system checks need attention.",
      href: "/system-health",
      severity: input.health === "critical" ? "critical" : "warning",
    });
  }
  if (input.lockedAccounts > 0) {
    alerts.push({
      id: "locked-accounts",
      title: plural(input.lockedAccounts, "account locked", "accounts locked"),
      description: "Review the failed sign-ins or unlock the account.",
      href: "/accounts?status=locked",
      severity: "critical",
    });
  }
  if (input.failedLogins >= FAILED_LOGIN_ALERT_THRESHOLD) {
    alerts.push({
      id: "failed-logins",
      title: plural(input.failedLogins, "failed sign-in in 24 hours", "failed sign-ins in 24 hours"),
      description: "Check for suspicious activity.",
      href: "/audit-logs?event=failed_login&period=24h",
      severity: "critical",
    });
  }
  if (input.stalled > 0) {
    alerts.push({
      id: "stalled-work",
      title: plural(input.stalled, "request stalled", "requests stalled"),
      description: "No update for more than 3 days.",
      href: "/admin-operations?view=stalled",
      severity: "warning",
    });
  }
  if (input.unassigned > 0) {
    alerts.push({
      id: "awaiting-assignment",
      title: plural(input.unassigned, "request awaiting assignment", "requests awaiting assignment"),
      description: "Approved and ready to be assigned to staff.",
      href: "/inbox?workflow=ready_for_assignment",
      severity: "warning",
    });
  }
  // Critical first; Array#sort is stable, so the order above is kept within a severity.
  return alerts.sort((a, b) => Number(b.severity === "critical") - Number(a.severity === "critical"));
}

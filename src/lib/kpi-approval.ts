export type KpiOwnerRole =
  | "receptionist"
  | "service_agent"
  | "approver"
  | "final_approver";

export type KpiScorecardStatus = "draft" | "submitted" | "approved" | "rejected";

export const KPI_STATUS_LABELS: Record<KpiScorecardStatus, string> = {
  draft: "Draft",
  submitted: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const KPI_ROLE_LABELS: Record<KpiOwnerRole, string> = {
  receptionist: "Admin (Receptionist)",
  service_agent: "Staff",
  approver: "First Approval",
  final_approver: "Final Approval",
};

/**
 * Who has to approve the KPIs of a given role.
 * Final Approval has full authority over their own KPIs (null = no approval needed).
 */
export function requiredApproverRole(
  ownerRole: KpiOwnerRole,
): "approver" | "final_approver" | null {
  if (ownerRole === "final_approver") return null;
  if (ownerRole === "approver") return "final_approver";
  return "approver";
}

type Reviewer = { id: string; role: string };
type Owner = { id: string; role: KpiOwnerRole };

/**
 * Any user with the right role can review (First/Final Approval cover all of GA
 * and IT), as long as they are not the owner of the KPIs.
 */
export function canReviewScorecard(reviewer: Reviewer, owner: Owner) {
  const required = requiredApproverRole(owner.role);
  return (
    required !== null &&
    reviewer.id !== owner.id &&
    reviewer.role === required
  );
}

/** A scorecard is editable only as draft/rejected; Final Approval can always edit. */
export function canEditScorecard(ownerRole: KpiOwnerRole, status: KpiScorecardStatus) {
  if (ownerRole === "final_approver") return true;
  return status === "draft" || status === "rejected";
}

export type SubmitResult =
  | { ok: true; status: "submitted" | "approved" }
  | { ok: false; reason: string };

export function submitScorecard(
  ownerRole: KpiOwnerRole,
  itemCount: number,
  totalWeight: number,
): SubmitResult {
  if (itemCount === 0) return { ok: false, reason: "Add at least one KPI." };
  if (totalWeight !== 100) {
    return { ok: false, reason: `Total weight must be 100% (currently ${totalWeight}%).` };
  }
  return {
    ok: true,
    status: requiredApproverRole(ownerRole) === null ? "approved" : "submitted",
  };
}

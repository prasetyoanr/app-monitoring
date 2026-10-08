import type { AccountRole } from "@/data/types";

export function accountRoleRequiresDivision(role: AccountRole) {
  return role === "requester" || role === "service_agent";
}

export function accountRoleHasGlobalScope(role: AccountRole) {
  return role === "administrator" || role === "receptionist" || role === "approver" || role === "final_approver";
}

// Admin, first approval and final approval may belong to a division or stay global
// (no division). Global scope is only available to these roles; requesters and staff
// must always have a division. The administrator account is never tied to a division.
export function accountRoleHasOptionalDivision(role: AccountRole) {
  return role === "receptionist" || role === "approver" || role === "final_approver";
}

export function accountRoleAllowsDivision(role: AccountRole) {
  return accountRoleRequiresDivision(role) || accountRoleHasOptionalDivision(role);
}

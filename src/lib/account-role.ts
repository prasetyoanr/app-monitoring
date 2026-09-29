import type { AccountRole } from "@/data/types";

export function accountRoleRequiresDivision(role: AccountRole) {
  return role === "requester" || role === "service_agent";
}

export function accountRoleHasGlobalScope(role: AccountRole) {
  return role === "administrator" || role === "receptionist" || role === "approver" || role === "final_approver";
}

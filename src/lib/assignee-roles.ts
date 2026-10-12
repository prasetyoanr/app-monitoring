import type { AccountRole } from "@/data/types";

// Roles that can carry out assigned work. Admin (Receptionist) accounts of a GA unit can
// receive work too, because their job also includes serving users directly.
export function isAssigneeRole(role: AccountRole | string | null | undefined) {
  return role === "service_agent" || role === "receptionist";
}

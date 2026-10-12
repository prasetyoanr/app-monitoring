import "server-only";

import { and, eq, or } from "drizzle-orm";
import { masterDivisions, technicians } from "@/db/schema";

// Who can be given a request: Staff, and Admin (Receptionist) accounts of a GA unit, whose
// job also includes serving users directly. Needs master_divisions joined on the account.
export const assigneeAccountFilter = or(
  eq(technicians.role, "service_agent"),
  and(eq(technicians.role, "receptionist"), eq(masterDivisions.isGaUnit, true)),
);

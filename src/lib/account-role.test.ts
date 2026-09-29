import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRole } from "@/data/types";
import { accountRoleHasGlobalScope, accountRoleRequiresDivision } from "./account-role";

test("organizational workflow roles are global while request and service roles require a division", () => {
  const globalRoles: AccountRole[] = ["administrator", "receptionist", "approver", "final_approver"];
  const divisionRoles: AccountRole[] = ["requester", "service_agent"];

  for (const role of globalRoles) {
    assert.equal(accountRoleHasGlobalScope(role), true);
    assert.equal(accountRoleRequiresDivision(role), false);
  }
  for (const role of divisionRoles) {
    assert.equal(accountRoleHasGlobalScope(role), false);
    assert.equal(accountRoleRequiresDivision(role), true);
  }
});

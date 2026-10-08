import assert from "node:assert/strict";
import test from "node:test";
import type { AccountRole } from "@/data/types";
import {
  accountRoleAllowsDivision,
  accountRoleHasGlobalScope,
  accountRoleHasOptionalDivision,
  accountRoleRequiresDivision,
} from "./account-role";

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

test("only admin and approval roles may be global or hold a division; the others require one", () => {
  const optional: AccountRole[] = ["receptionist", "approver", "final_approver"];
  for (const role of optional) {
    assert.equal(accountRoleHasOptionalDivision(role), true);
    assert.equal(accountRoleAllowsDivision(role), true);
    assert.equal(accountRoleRequiresDivision(role), false);
  }
  for (const role of ["requester", "service_agent"] as AccountRole[]) {
    assert.equal(accountRoleHasOptionalDivision(role), false);
    assert.equal(accountRoleAllowsDivision(role), true);
    assert.equal(accountRoleRequiresDivision(role), true);
  }
  assert.equal(accountRoleAllowsDivision("administrator"), false);
});

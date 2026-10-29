import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { canViewGaSpreadsheet, isGaSpreadsheetEligible, normalizeGoogleSpreadsheetUrl, validateGaSpreadsheetInput } from "./ga-spreadsheet";

describe("GA spreadsheet validation", () => {
  test("accepts an HTTPS Google Sheets URL", () => {
    assert.equal(
      normalizeGoogleSpreadsheetUrl(" https://docs.google.com/spreadsheets/d/example/edit#gid=0 "),
      "https://docs.google.com/spreadsheets/d/example/edit#gid=0",
    );
  });

  for (const url of [
    "http://docs.google.com/spreadsheets/d/example/edit",
    "https://drive.google.com/file/d/example",
    "https://docs.google.com/document/d/example/edit",
    "javascript:alert(1)",
  ]) {
    test(`rejects an unsupported link: ${url}`, () => {
      assert.throws(() => normalizeGoogleSpreadsheetUrl(url));
    });
  }

  test("normalizes report fields", () => {
    assert.deepEqual(validateGaSpreadsheetInput({
      title: " Weekly activity report ",
      url: "https://docs.google.com/spreadsheets/d/example/edit",
      description: " Team-maintained details ",
    }), {
      title: "Weekly activity report",
      url: "https://docs.google.com/spreadsheets/d/example/edit",
      description: "Team-maintained details",
    });
  });
});

describe("GA spreadsheet eligibility", () => {
  const base = { isActive: true, isGaUnit: true, divisionSlug: "general-affair", isIt: false };

  test("every role except requester can hold a spreadsheet", () => {
    for (const role of ["service_agent", "receptionist", "approver", "final_approver"]) {
      assert.equal(isGaSpreadsheetEligible({ ...base, role }), true, role);
    }
    assert.equal(isGaSpreadsheetEligible({ ...base, role: "requester" }), false);
    assert.equal(isGaSpreadsheetEligible({ ...base, role: "administrator" }), false);
  });

  test("a service agent of another GA unit qualifies, other roles need the GA division", () => {
    assert.equal(isGaSpreadsheetEligible({ ...base, role: "service_agent", divisionSlug: "legal" }), true);
    assert.equal(isGaSpreadsheetEligible({ ...base, role: "service_agent", isGaUnit: false }), false);
    assert.equal(isGaSpreadsheetEligible({ ...base, role: "approver", divisionSlug: "finance", isGaUnit: false }), false);
  });

  test("inactive and IT accounts never qualify", () => {
    assert.equal(isGaSpreadsheetEligible({ ...base, role: "receptionist", isActive: false }), false);
    assert.equal(isGaSpreadsheetEligible({ ...base, role: "service_agent", isIt: true }), false);
  });
});

describe("GA spreadsheet viewing", () => {
  test("administrator and eligible owner can view", () => {
    assert.equal(canViewGaSpreadsheet({ role: "administrator", isEligible: false, isOwner: false, hasGrant: false }), true);
    assert.equal(canViewGaSpreadsheet({ role: "service_agent", isEligible: true, isOwner: true, hasGrant: false }), true);
  });

  test("another GA account needs an active grant", () => {
    assert.equal(canViewGaSpreadsheet({ role: "approver", isEligible: true, isOwner: false, hasGrant: true }), true);
    assert.equal(canViewGaSpreadsheet({ role: "approver", isEligible: true, isOwner: false, hasGrant: false }), false);
    assert.equal(canViewGaSpreadsheet({ role: "requester", isEligible: false, isOwner: false, hasGrant: true }), false);
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { normalizeGoogleSpreadsheetUrl, validateGaSpreadsheetInput } from "./ga-spreadsheet";

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

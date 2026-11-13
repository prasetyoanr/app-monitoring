import assert from "node:assert/strict";
import test from "node:test";

import { fileKindFromName, formatFileSize, normalizeAttachmentLink } from "./kpi-attachment";

test("links without a scheme default to https", () => {
  const result = normalizeAttachmentLink("example.com/report");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.url, "https://example.com/report");
});

test("only http and https links are accepted", () => {
  assert.equal(normalizeAttachmentLink("javascript:alert(1)").ok, false);
  assert.equal(normalizeAttachmentLink("data:text/html,hi").ok, false);
  assert.equal(normalizeAttachmentLink("ftp://example.com/a").ok, false);
  assert.equal(normalizeAttachmentLink("   ").ok, false);
  assert.equal(normalizeAttachmentLink("notalink").ok, false);
});

test("spreadsheet links are detected", () => {
  const sheet = normalizeAttachmentLink("https://docs.google.com/spreadsheets/d/abc/edit");
  assert.equal(sheet.ok && sheet.isSpreadsheet, true);
  const excel = normalizeAttachmentLink("https://files.example.com/data/q2.xlsx");
  assert.equal(excel.ok && excel.isSpreadsheet, true);
  const doc = normalizeAttachmentLink("https://docs.google.com/document/d/abc");
  assert.equal(doc.ok && doc.isSpreadsheet, false);
});

test("file helpers", () => {
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(2048), "2 KB");
  assert.equal(formatFileSize(3 * 1024 * 1024), "3.0 MB");
  assert.equal(fileKindFromName("Report.XLSX"), "spreadsheet");
  assert.equal(fileKindFromName("bast.pdf"), "document");
  assert.equal(fileKindFromName("photo.jpg"), "image");
  assert.equal(fileKindFromName("archive.zip"), "other");
});

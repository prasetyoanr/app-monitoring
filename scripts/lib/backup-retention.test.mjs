import assert from "node:assert/strict";
import test from "node:test";

import { backupFileName, parseBackupName, selectBackupsToKeep } from "./backup-retention.mjs";

const name = (iso) => backupFileName("db_monitoring", new Date(iso));

test("file names round-trip through the parser", () => {
  const file = name("2026-10-07T03:15:09");
  assert.equal(file, "db_monitoring-20261007-031509.dump");
  assert.equal(parseBackupName(file, "db_monitoring")?.date.getHours(), 3);
});

test("files that do not follow the pattern or belong to another database are ignored", () => {
  assert.equal(parseBackupName("before-ga-management-1790224480198.dump", "db_monitoring"), null);
  assert.equal(parseBackupName("other_db-20261007-031509.dump", "db_monitoring"), null);
});

test("keeps the newest daily backups and one per recent week", () => {
  const files = [];
  for (let day = 0; day < 60; day += 1) {
    const date = new Date(2026, 9, 7 - day, 2, 0, 0);
    files.push(backupFileName("db_monitoring", date));
  }
  const { keep, remove } = selectBackupsToKeep(files, "db_monitoring", { daily: 7, weekly: 4 });
  assert.equal(keep.includes(files[0]), true);
  assert.equal(keep.length >= 7 && keep.length <= 7 + 4, true);
  assert.equal(keep.length + remove.length, files.length);
  assert.equal(remove.includes(files[0]), false);
});

test("never deletes the only backup and never touches unrelated files", () => {
  const only = name("2026-01-01T02:00:00");
  const result = selectBackupsToKeep([only, "notes.txt", "before-ga-management-1.dump"], "db_monitoring", { daily: 0, weekly: 0 });
  assert.deepEqual(result.keep, [only]);
  assert.deepEqual(result.remove, []);
});

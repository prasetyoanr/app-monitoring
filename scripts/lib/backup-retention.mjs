// Backup file names look like `<database>-YYYYMMDD-HHMMSS.dump`. Only files that match
// this pattern are ever considered for deletion, so other dumps in the folder are safe.
const NAME = /^(.+)-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.dump$/;

export function backupFileName(database, date = new Date()) {
  const pad = (value, size = 2) => String(value).padStart(size, "0");
  return `${database}-${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.dump`;
}

export function parseBackupName(name, database) {
  const match = NAME.exec(name);
  if (!match || match[1] !== database) return null;
  const [, , year, month, day, hour, minute, second] = match;
  return { name, date: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) };
}

function weekKey(date) {
  // Weeks start on Monday; the key is the date of that Monday.
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}

// Keeps the newest `daily` backups, plus the newest backup of each of the last `weekly`
// weeks. Everything else that matches the naming pattern is returned in `remove`.
export function selectBackupsToKeep(names, database, { daily = 14, weekly = 8 } = {}) {
  const parsed = names
    .map((name) => parseBackupName(name, database))
    .filter(Boolean)
    .sort((a, b) => b.date - a.date);
  const keep = new Set(parsed.slice(0, Math.max(1, daily)).map((item) => item.name));
  const weeksSeen = new Set();
  for (const item of parsed) {
    const key = weekKey(item.date);
    if (weeksSeen.has(key)) continue;
    if (weeksSeen.size >= weekly) break;
    weeksSeen.add(key);
    keep.add(item.name);
  }
  return {
    keep: parsed.filter((item) => keep.has(item.name)).map((item) => item.name),
    remove: parsed.filter((item) => !keep.has(item.name)).map((item) => item.name),
  };
}

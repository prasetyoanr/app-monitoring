import type { AuditLogRecord } from "@/data/audit-log-data";

const sensitiveMetadataKey = /(?:password|token|secret|credential|cookie|hash|signature)/i;

export function sanitizeMetadata(value: unknown, key = "", depth = 0): unknown {
  if (sensitiveMetadataKey.test(key)) return "[REDACTED]";
  if (depth >= 8) return "[MAX DEPTH]";
  if (Array.isArray(value)) return value.map((item) => sanitizeMetadata(item, "", depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeMetadata(childValue, childKey, depth + 1),
      ]),
    );
  }
  return value;
}

export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function buildAuditLogCsv(records: AuditLogRecord[]) {
  const header = [
    "Time (WIB)",
    "Actor type",
    "Actor name",
    "Username",
    "Actor ID",
    "Action",
    "Entity type",
    "Entity ID",
    "Details",
  ];
  const rows = records.map((record) => [
    `${dateTime.format(new Date(record.createdAt)).replace(",", "")} WIB`,
    record.actorType,
    record.actorName,
    record.actorUsername,
    record.actorId,
    record.action,
    record.entityType,
    record.entityId,
    record.metadata ? JSON.stringify(sanitizeMetadata(record.metadata)) : "",
  ]);

  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

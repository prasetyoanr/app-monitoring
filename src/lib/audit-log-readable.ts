import { sanitizeMetadata } from "./audit-log-export";

// Turns the raw audit rows into text a person can read in a spreadsheet: a module name, an
// action label, and the details as "Name: value" lines instead of a JSON blob.

const EXCEL_CELL_LIMIT = 32_000;

function words(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .trim()
    .toLowerCase();
}

function sentence(value: string) {
  const text = words(value);
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

export function auditModuleName(action: string): string {
  const name = action.toLowerCase();
  if (name.startsWith("authentication.")) return "Authentication";
  if (name.startsWith("authorization.") || name.startsWith("sensitive_data.")) return "Security";
  if (name.startsWith("account.")) return "Accounts";
  if (name.startsWith("master_")) return "Master data";
  if (name.startsWith("ga_internal_request.")) return "Internal GA";
  if (name.startsWith("ga.")) return "GA activities";
  if (name.startsWith("report.")) return "Reports";
  if (name.startsWith("audit_log.")) return "Log administration";
  if (name.startsWith("survey.")) return "Surveys";
  if (name.startsWith("backup_")) return "Backup users";
  if (/^(request|issue|approval)\./.test(name) || name === "submitted") return "Requests & workflow";
  return "Other";
}

// "ga.spreadsheet.permission_updated" -> "Spreadsheet · Permission updated"
export function auditActionLabel(action: string): string {
  const parts = action.split(".");
  if (parts.length === 1) return sentence(action);
  const verb = sentence(parts[parts.length - 1]);
  // The leading "ga" only names the area; the subject is what comes after it.
  const subject = parts.slice(parts[0] === "ga" ? 1 : 0, -1).join(" ");
  return subject ? `${sentence(subject)} · ${verb}` : verb;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function flatten(value: unknown, prefix: string, lines: string[]) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix} ${words(key)}` : key, lines);
    }
    return;
  }
  // Empty values (an unused filter, no recipient) only add noise to the sheet.
  if (value === null || value === undefined || value === "") return;
  lines.push(`${sentence(prefix)}: ${formatValue(value)}`);
}

// One "Name: value" line per detail that has a value. Sensitive keys are redacted before anything is printed.
export function auditDetailsText(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata || !Object.keys(metadata).length) return "";
  const lines: string[] = [];
  flatten(sanitizeMetadata(metadata), "", lines);
  const text = lines.join("\n");
  return text.length > EXCEL_CELL_LIMIT ? `${text.slice(0, EXCEL_CELL_LIMIT)}\n… (shortened)` : text;
}

// "ga_internal_request" -> "Ga internal request"
export function auditEntityLabel(entityType: string): string {
  return sentence(entityType);
}

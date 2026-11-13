export type KpiAttachmentType = "file" | "link";

// Prototype limit; the real limit is decided together with the storage backend.
export const KPI_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export type NormalizedLink =
  | { ok: true; url: string; host: string; isSpreadsheet: boolean }
  | { ok: false; reason: string };

/**
 * Accepts only http(s) links so attachment can never become a javascript: or data: URL.
 * A missing scheme is treated as https.
 */
export function normalizeAttachmentLink(raw: string): NormalizedLink {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, reason: "Paste a link first." };
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "This does not look like a valid link." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links are allowed." };
  }
  if (!parsed.hostname.includes(".")) {
    return { ok: false, reason: "This does not look like a valid link." };
  }
  const isSpreadsheet =
    (parsed.hostname === "docs.google.com" && parsed.pathname.startsWith("/spreadsheets")) ||
    /\.(xlsx?|csv)$/i.test(parsed.pathname);
  return { ok: true, url: parsed.toString(), host: parsed.hostname, isSpreadsheet };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileKind = "spreadsheet" | "document" | "image" | "other";

export function fileKindFromName(name: string): FileKind {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls", "csv", "ods"].includes(extension)) return "spreadsheet";
  if (["pdf", "doc", "docx", "txt", "odt", "ppt", "pptx"].includes(extension)) return "document";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(extension)) return "image";
  return "other";
}

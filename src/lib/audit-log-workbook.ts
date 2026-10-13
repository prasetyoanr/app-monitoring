import ExcelJS from "exceljs";

import type { AuditLogRecord } from "@/data/audit-log-data";
import { auditActionTone, type AuditActionTone } from "@/lib/audit-action-style";
import { auditActionLabel, auditDetailsText, auditEntityLabel, auditModuleName } from "@/lib/audit-log-readable";

const HEADER_FILL = "FF1E1B4B";
const ZEBRA_FILL = "FFF8FAFC";
const BORDER = { style: "thin" as const, color: { argb: "FFE2E8F0" } };

// Same colour families as the pills on the Log page.
const toneStyle: Record<AuditActionTone, { fill: string; font: string }> = {
  alert: { fill: "FFFEE2E2", font: "FF991B1B" },
  delete: { fill: "FFFFEDD5", font: "FF9A3412" },
  sensitive: { fill: "FFFEF3C7", font: "FF92400E" },
  approval: { fill: "FFEDE9FE", font: "FF5B21B6" },
  create: { fill: "FFDCFCE7", font: "FF166534" },
  update: { fill: "FFE0F2FE", font: "FF075985" },
  session: { fill: "FFF1F5F9", font: "FF475569" },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const columns = [
  { header: "No", width: 6, center: true },
  { header: "Date (WIB)", width: 14 },
  { header: "Time (WIB)", width: 11, center: true },
  { header: "Module", width: 20 },
  { header: "Action", width: 36, status: true },
  { header: "Actor", width: 24 },
  { header: "Actor type", width: 12, center: true },
  { header: "Item", width: 26 },
  { header: "Item ID", width: 38 },
  { header: "Details", width: 60, wrap: true },
] as const;

export interface AuditWorkbookMeta {
  generatedAt: string;
  filterSummary: string;
  truncated: boolean;
  limit: number;
}

function actorLabel(record: AuditLogRecord) {
  if (record.actorName) {
    return record.actorUsername && record.actorUsername !== record.actorName
      ? `${record.actorName} (${record.actorUsername})`
      : record.actorName;
  }
  if (record.actorType === "system") return "System";
  return record.actorId ?? "-";
}

export async function buildAuditLogWorkbook(records: AuditLogRecord[], meta: AuditWorkbookMeta): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "General Affairs Management System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Activity log", {
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 5, showGridLines: false }],
  });
  const lastColumn = columns.length;
  worksheet.columns = columns.map((column) => ({ width: column.width }));

  const merged = (row: number, value: string, font: Partial<ExcelJS.Font>, height: number) => {
    worksheet.mergeCells(row, 1, row, lastColumn);
    const cell = worksheet.getCell(row, 1);
    cell.value = value;
    cell.font = { name: "Calibri", ...font };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    worksheet.getRow(row).height = height;
  };

  merged(1, "Activity log", { size: 15, bold: true, color: { argb: HEADER_FILL } }, 28);
  merged(
    2,
    `Generated: ${meta.generatedAt}   ·   Records: ${records.length.toLocaleString("en-US")}${meta.truncated ? ` (limited to the newest ${meta.limit.toLocaleString("en-US")})` : ""}`,
    { size: 10, color: { argb: "FF64748B" } },
    18,
  );
  merged(3, `Filters: ${meta.filterSummary}`, { size: 10, color: { argb: "FF64748B" } }, 18);

  const headerRow = worksheet.getRow(5);
  headerRow.height = 26;
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center" in column && column.center ? "center" : "left", wrapText: true };
    cell.border = { bottom: BORDER };
  });
  worksheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: lastColumn } };

  if (!records.length) {
    worksheet.mergeCells(6, 1, 6, lastColumn);
    const empty = worksheet.getCell(6, 1);
    empty.value = "No records match these filters.";
    empty.font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF64748B" } };
    empty.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(6).height = 32;
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  records.forEach((record, index) => {
    const when = new Date(record.createdAt);
    const details = auditDetailsText(record.metadata);
    const values = [
      index + 1,
      dateFormat.format(when),
      timeFormat.format(when),
      auditModuleName(record.action),
      auditActionLabel(record.action),
      actorLabel(record),
      record.actorType,
      auditEntityLabel(record.entityType),
      record.entityId,
      details,
    ];
    const row = worksheet.getRow(6 + index);
    // Rows with several detail lines need more height; Excel does not size wrapped text itself.
    const lineCount = Math.max(1, details ? details.split("\n").length : 1);
    row.height = Math.min(150, Math.max(20, lineCount * 15 + 5));
    const tone = toneStyle[auditActionTone(record.action)];
    values.forEach((value, valueIndex) => {
      const column = columns[valueIndex];
      const cell = row.getCell(valueIndex + 1);
      cell.value = value;
      cell.font = { name: "Calibri", size: 10.5, color: { argb: "FF0F172A" } };
      cell.alignment = {
        vertical: "top",
        horizontal: "center" in column && column.center ? "center" : "left",
        wrapText: "wrap" in column && column.wrap,
      };
      cell.border = { bottom: BORDER };
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
      if ("status" in column && column.status) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tone.fill } };
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: tone.font } };
      }
    });
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

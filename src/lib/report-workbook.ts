import ExcelJS from "exceljs";

import type { ReportSheet, ReportTone } from "@/lib/role-report";

const HEADER_FILL = "FF1E1B4B";
const ZEBRA_FILL = "FFF8FAFC";
const BORDER = { style: "thin" as const, color: { argb: "FFE2E8F0" } };

const toneStyle: Record<Exclude<ReportTone, "none">, { fill: string; font: string }> = {
  ok: { fill: "FFDCFCE7", font: "FF166534" },
  wait: { fill: "FFFEF3C7", font: "FF92400E" },
  bad: { fill: "FFFEE2E2", font: "FF991B1B" },
  run: { fill: "FFDBEAFE", font: "FF1E40AF" },
};

export interface WorkbookMeta {
  periodLabel: string;
  generatedBy: string;
  generatedAt: string;
}

// Layout of every tab: title, meta line, summary line, then the table with a frozen,
// filterable header. Status cells are coloured so the table reads at a glance.
export async function buildReportWorkbook(sheets: ReportSheet[], meta: WorkbookMeta): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "General Affairs Management System";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name, {
      properties: { defaultRowHeight: 20 },
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      views: [{ state: "frozen", ySplit: 6, showGridLines: false }],
    });
    const lastColumn = Math.max(sheet.columns.length, 1);
    worksheet.columns = sheet.columns.map((column) => ({ key: column.key, width: column.width }));

    const merged = (row: number, value: string, font: Partial<ExcelJS.Font>, height: number) => {
      worksheet.mergeCells(row, 1, row, lastColumn);
      const cell = worksheet.getCell(row, 1);
      cell.value = value;
      cell.font = { name: "Calibri", ...font };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      worksheet.getRow(row).height = height;
    };

    merged(1, sheet.title, { size: 15, bold: true, color: { argb: HEADER_FILL } }, 28);
    merged(2, `Period: ${meta.periodLabel}   ·   Generated: ${meta.generatedAt}   ·   By: ${meta.generatedBy}`, { size: 10, color: { argb: "FF64748B" } }, 18);
    if (sheet.summary.length) {
      merged(4, sheet.summary.map((item) => `${item.label}: ${item.value}`).join("     ·     "), { size: 11, bold: true, color: { argb: "FF0F172A" } }, 24);
    }

    const headerRow = worksheet.getRow(6);
    headerRow.height = 26;
    sheet.columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.header;
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.alignment = { vertical: "middle", horizontal: column.align === "center" ? "center" : "left", wrapText: true };
      cell.border = { bottom: BORDER };
    });
    worksheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: lastColumn } };

    if (!sheet.rows.length) {
      worksheet.mergeCells(7, 1, 7, lastColumn);
      const empty = worksheet.getCell(7, 1);
      empty.value = "No records in this period.";
      empty.font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF64748B" } };
      empty.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getRow(7).height = 32;
      continue;
    }

    sheet.rows.forEach((record, rowIndex) => {
      const row = worksheet.getRow(7 + rowIndex);
      const tone = sheet.tones[rowIndex] ?? "none";
      sheet.columns.forEach((column, index) => {
        const cell = row.getCell(index + 1);
        cell.value = record[column.key] ?? null;
        cell.font = { name: "Calibri", size: 10.5, color: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "top", horizontal: column.align === "center" ? "center" : "left", wrapText: Boolean(column.wrap) };
        cell.border = { bottom: BORDER };
        if (rowIndex % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
        if (column.status && tone !== "none") {
          const style = toneStyle[tone];
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
          cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: style.font } };
          cell.alignment = { vertical: "top", horizontal: "center" };
        }
      });
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

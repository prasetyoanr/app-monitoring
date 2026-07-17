import type { Alignment, CellValue } from "exceljs";

export interface ExcelColumnDefinition {
  header: string;
  key: string;
  width: number;
  alignment?: Alignment["horizontal"];
  numberFormat?: string;
  wrapText?: boolean;
}

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  columns: ExcelColumnDefinition[];
  rows: Array<Record<string, CellValue>>;
}

export const troubleshootingExcelColumns: ExcelColumnDefinition[] = [
  { header: "No.", key: "number", width: 7, alignment: "center", numberFormat: "0" },
  { header: "ID", key: "id", width: 22 },
  { header: "Date", key: "date", width: 14, alignment: "center", numberFormat: "dd/mm/yyyy" },
  { header: "Location", key: "location", width: 16 },
  { header: "Requester", key: "requester", width: 24 },
  { header: "Division", key: "division", width: 22 },
  { header: "Issue", key: "issue", width: 38, wrapText: true },
  { header: "Category", key: "category", width: 18 },
  { header: "Priority", key: "priority", width: 14, alignment: "center" },
  { header: "Status", key: "status", width: 28 },
  { header: "Completion Time (Days)", key: "completionDays", width: 22, alignment: "center", numberFormat: "0" },
  { header: "Description", key: "description", width: 60, wrapText: true },
];

export const backupExcelColumns: ExcelColumnDefinition[] = [
  { header: "No.", key: "number", width: 7, alignment: "center", numberFormat: "0" },
  { header: "ID", key: "id", width: 22 },
  { header: "User", key: "user", width: 28 },
  { header: "Division", key: "division", width: 22 },
  { header: "Sync Folder Path", key: "syncPath", width: 48, wrapText: true },
  { header: "Submitted At", key: "submittedAt", width: 21, alignment: "center", numberFormat: "dd/mm/yyyy hh:mm" },
  { header: "Status", key: "status", width: 16, alignment: "center" },
];

export const surveyExcelColumns: ExcelColumnDefinition[] = [
  { header: "No.", key: "number", width: 7, alignment: "center", numberFormat: "0" },
  { header: "Survey", key: "survey", width: 30 },
  { header: "Response ID", key: "responseId", width: 39 },
  { header: "Submitted At", key: "submittedAt", width: 21, alignment: "center", numberFormat: "dd/mm/yyyy hh:mm" },
  { header: "Client", key: "client", width: 24 },
  { header: "Division", key: "division", width: 20 },
  { header: "Question", key: "question", width: 40, wrapText: true },
  { header: "Question Type", key: "questionType", width: 20 },
  { header: "Answer", key: "answer", width: 48, wrapText: true },
  { header: "AI Status", key: "aiStatus", width: 18 },
  { header: "AI Sentiment", key: "aiSentiment", width: 20 },
  { header: "AI Score", key: "aiScore", width: 12, alignment: "center", numberFormat: "0" },
  { header: "AI Confidence", key: "aiConfidence", width: 16, alignment: "center", numberFormat: "0\"%\"" },
  { header: "AI Summary", key: "aiSummary", width: 52, wrapText: true },
];

export function excelDate(localDateTime: string) {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(localDateTime)) {
    return null;
  }
  const [date, time = "00:00"] = localDateTime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

export async function buildExcelReport({
  sheetName,
  columns,
  rows,
}: ExcelExportOptions) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IT Activity Log";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 20 },
    views: [
      {
        state: "frozen",
        xSplit: Math.min(2, columns.length),
        ySplit: 1,
        showGridLines: false,
      },
    ],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  worksheet.addRows(rows);
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: columns.length },
  };

  const header = worksheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3157D5" } };
    cell.font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  for (let rowIndex = 2; rowIndex <= rows.length + 1; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const definition = columns[columnNumber - 1];
      cell.font = { name: "Aptos", size: 10, color: { argb: "FF1E293B" } };
      cell.alignment = {
        vertical: "top",
        horizontal: definition.alignment ?? "left",
        wrapText: definition.wrapText ?? false,
      };
      if (definition.numberFormat) cell.numFmt = definition.numberFormat;
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (rowIndex % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  }

  return workbook.xlsx.writeBuffer();
}

export async function downloadExcelReport(options: ExcelExportOptions) {
  const buffer = await buildExcelReport(options);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

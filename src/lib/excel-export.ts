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
  images?: ExcelImageDefinition[];
  additionalSheets?: ExcelWorksheetDefinition[];
}

export interface ExcelWorksheetDefinition {
  sheetName: string;
  columns: ExcelColumnDefinition[];
  rows: Array<Record<string, CellValue>>;
}

export interface ExcelImageDefinition {
  rowIndex: number;
  columnKey: string;
  sourceUrl: string;
  extension: "jpeg" | "png";
  width?: number;
  height?: number;
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
  { header: "Work Photo", key: "workPhoto", width: 22, alignment: "center" },
  { header: "Client Signature", key: "clientSignature", width: 22, alignment: "center" },
  { header: "Approved By", key: "approvedBy", width: 24 },
  { header: "Approved At", key: "approvedAt", width: 21, alignment: "center", numberFormat: "dd/mm/yyyy hh:mm" },
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
  { header: "KPI Code", key: "kpiCode", width: 13, alignment: "center" },
  { header: "KPI Category", key: "kpiCategory", width: 24 },
  { header: "Answer", key: "answer", width: 48, wrapText: true },
  { header: "Rating Label", key: "ratingLabel", width: 20 },
  { header: "CSAT Result", key: "csatResult", width: 18, alignment: "center" },
  { header: "CSAT Contribution", key: "csatContribution", width: 19, alignment: "center", numberFormat: "0\"%\"" },
  { header: "AI Status", key: "aiStatus", width: 18 },
  { header: "AI Sentiment", key: "aiSentiment", width: 20 },
  { header: "AI Score", key: "aiScore", width: 12, alignment: "center", numberFormat: "0" },
  { header: "AI Confidence", key: "aiConfidence", width: 16, alignment: "center", numberFormat: "0\"%\"" },
  { header: "AI Summary", key: "aiSummary", width: 52, wrapText: true },
];

export const surveyKpiExcelColumns: ExcelColumnDefinition[] = [
  { header: "No.", key: "number", width: 7, alignment: "center", numberFormat: "0" },
  { header: "Survey", key: "survey", width: 30 },
  { header: "KPI Code", key: "kpiCode", width: 13, alignment: "center" },
  { header: "KPI Category", key: "kpiCategory", width: 28 },
  { header: "Rating Questions", key: "questionCount", width: 18, alignment: "center", numberFormat: "0" },
  { header: "Rating Responses", key: "responseCount", width: 18, alignment: "center", numberFormat: "0" },
  { header: "Average Rating", key: "averageRating", width: 17, alignment: "center", numberFormat: "0.0" },
  { header: "Satisfied (4–5)", key: "satisfiedCount", width: 18, alignment: "center", numberFormat: "0" },
  { header: "Satisfaction Score", key: "satisfactionScore", width: 19, alignment: "center", numberFormat: "0.0\"%\"" },
  { header: "Target", key: "target", width: 12, alignment: "center", numberFormat: "0\"%\"" },
  { header: "Target Achievement", key: "targetAchievement", width: 20, alignment: "center", numberFormat: "0.0\"%\"" },
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

async function blobDataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(chunks.join(""))}`;
}

async function excelImageDataUrl(image: ExcelImageDefinition) {
  if (image.sourceUrl.startsWith("data:")) return image.sourceUrl;
  const response = await fetch(image.sourceUrl, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Image request failed with HTTP ${response.status}.`);
  const blob = await response.blob();
  if (image.extension === "png") return blobDataUrl(blob);

  const sourceUrl = URL.createObjectURL(blob);
  try {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to decode an Excel image."));
      element.src = sourceUrl;
    });
    const maximum = 900;
    const scale = Math.min(1, maximum / Math.max(source.naturalWidth, source.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Unable to prepare an Excel image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function buildExcelReport({
  sheetName,
  columns,
  rows,
  images = [],
  additionalSheets = [],
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

  for (const image of images) {
    const columnIndex = columns.findIndex((column) => column.key === image.columnKey);
    if (columnIndex < 0 || image.rowIndex < 0 || image.rowIndex >= rows.length) continue;
    try {
      const dataUrl = await excelImageDataUrl(image);
      const imageId = workbook.addImage({ base64: dataUrl, extension: image.extension });
      const excelRowNumber = image.rowIndex + 2;
      const width = image.width ?? 120;
      const height = image.height ?? 88;
      worksheet.getRow(excelRowNumber).height = Math.max(
        Number(worksheet.getRow(excelRowNumber).height ?? 24),
        Math.ceil((height + 16) * 0.75),
      );
      worksheet.getCell(excelRowNumber, columnIndex + 1).value = "";
      worksheet.addImage(imageId, {
        tl: { col: columnIndex + 0.08, row: excelRowNumber - 1 + 0.08 },
        ext: { width, height },
      });
    } catch (error) {
      console.error(
        "Unable to embed an image in the Excel report.",
        error instanceof Error ? error.message : "Unknown image error.",
      );
    }
  }

  for (const sheetDefinition of additionalSheets) {
    const extraWorksheet = workbook.addWorksheet(sheetDefinition.sheetName, {
      properties: { defaultRowHeight: 20 },
      views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      },
    });
    extraWorksheet.columns = sheetDefinition.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));
    extraWorksheet.addRows(sheetDefinition.rows);
    extraWorksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: {
        row: Math.max(1, sheetDefinition.rows.length + 1),
        column: sheetDefinition.columns.length,
      },
    };

    const extraHeader = extraWorksheet.getRow(1);
    extraHeader.height = 30;
    extraHeader.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3157D5" } };
      cell.font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    for (let rowIndex = 2; rowIndex <= sheetDefinition.rows.length + 1; rowIndex += 1) {
      const row = extraWorksheet.getRow(rowIndex);
      row.height = 24;
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        const definition = sheetDefinition.columns[columnNumber - 1];
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

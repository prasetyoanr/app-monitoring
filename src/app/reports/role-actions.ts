"use server";

import { ReportRequestError, buildRoleReport } from "@/data/role-reports";
import type { ActionResult } from "@/data/types";
import type { ReportCell, ReportColumn, ReportPeriodInput, ReportSummaryItem, ReportTone, RoleReportType } from "@/lib/role-report";

export interface ReportPreviewSheet {
  name: string;
  title: string;
  summary: ReportSummaryItem[];
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>>;
  tones: ReportTone[];
  totalRows: number;
  page: number;
  totalPages: number;
  startRow: number;
}

const PREVIEW_ROWS = 25;

// Preview uses the same scoped query as the download and returns one page per tab.
export async function previewRoleReportAction(input: {
  type: RoleReportType;
  period: ReportPeriodInput;
  memberId?: string;
  group?: string;
  pages?: Record<string, number>;
}): Promise<ActionResult<{ sheets: ReportPreviewSheet[]; totalRows: number }>> {
  try {
    const bundle = await buildRoleReport(input);
    return {
      ok: true,
      data: {
        totalRows: bundle.totalRows,
        sheets: bundle.sheets.map((sheet) => {
          const totalPages = Math.max(1, Math.ceil(sheet.rows.length / PREVIEW_ROWS));
          const requestedPage = input.pages?.[sheet.name];
          const page = typeof requestedPage === "number" && Number.isSafeInteger(requestedPage)
            ? Math.min(Math.max(requestedPage, 1), totalPages)
            : 1;
          const startRow = (page - 1) * PREVIEW_ROWS;
          return {
            name: sheet.name,
            title: sheet.title,
            summary: sheet.summary,
            columns: sheet.columns,
            rows: sheet.rows.slice(startRow, startRow + PREVIEW_ROWS),
            tones: sheet.tones.slice(startRow, startRow + PREVIEW_ROWS),
            totalRows: sheet.rows.length,
            page,
            totalPages,
            startRow,
          };
        }),
      },
    };
  } catch (error) {
    if (error instanceof ReportRequestError) return { ok: false, error: error.message };
    console.error("Unable to preview the report.", error);
    return { ok: false, error: "The preview could not be loaded." };
  }
}

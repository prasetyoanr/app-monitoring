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
}

const PREVIEW_ROWS = 8;

// Preview uses the same scoped query as the download, but only returns a few rows.
export async function previewRoleReportAction(input: {
  type: RoleReportType;
  period: ReportPeriodInput;
  memberId?: string;
}): Promise<ActionResult<{ sheets: ReportPreviewSheet[]; totalRows: number }>> {
  try {
    const bundle = await buildRoleReport(input);
    return {
      ok: true,
      data: {
        totalRows: bundle.totalRows,
        sheets: bundle.sheets.map((sheet) => ({
          name: sheet.name,
          title: sheet.title,
          summary: sheet.summary,
          columns: sheet.columns,
          rows: sheet.rows.slice(0, PREVIEW_ROWS),
          tones: sheet.tones.slice(0, PREVIEW_ROWS),
          totalRows: sheet.rows.length,
        })),
      },
    };
  } catch (error) {
    if (error instanceof ReportRequestError) return { ok: false, error: error.message };
    console.error("Unable to preview the report.", error);
    return { ok: false, error: "The preview could not be loaded." };
  }
}

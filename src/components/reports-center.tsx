"use client";

import { CalendarRange, ClipboardCheck, Download, FileSpreadsheet, FolderSync, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { recordReportExportAction } from "@/app/reports/actions";
import { MonthPicker } from "@/components/month-picker";
import { ReportPeriodProvider, type SharedReportPeriod } from "@/components/report-period-context";
import { Card } from "@/components/ui";
import type { BackupRecord, TicketRecord } from "@/data/types";
import type { SurveyAnswerValue, SurveyKpiCategory, SurveyReportRecord } from "@/data/survey-types";
import {
  backupExcelColumns,
  downloadExcelReport,
  excelDate,
  surveyExcelColumns,
  surveyKpiExcelColumns,
  troubleshootingExcelColumns,
} from "@/lib/excel-export";
import type { ExcelImageDefinition } from "@/lib/excel-export";
import { issueStatusLabel } from "@/lib/issue-status";
import { currentJakartaMonth, monthInputRange } from "@/lib/jakarta-date";
import {
  calculateSurveyRatingMetrics,
  isSatisfiedRating,
  isSurveyRating,
  SURVEY_KPI_CATEGORIES,
  SURVEY_RATING_LABELS,
  SURVEY_SATISFACTION_TARGET,
} from "@/lib/survey-metrics";

type FilterMode = "range" | "month";
type ExportType = "troubleshooting" | "backup" | "survey";

function dateMatches(date: string, mode: FilterMode, startDate: string, endDate: string, month: string) {
  if (mode === "month") return date.slice(0, 7) === month;
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function surveyAnswerText(value: SurveyAnswerValue) {
  return Array.isArray(value) ? value.join(" | ") : String(value);
}

export function ReportsCenter({ ticketRecords, backupRecords, surveyRecords, canAccessBackupReport, canAccessSurveyReport, hideInboxReport = false, children }: { hideInboxReport?: boolean; children?: React.ReactNode; ticketRecords: TicketRecord[]; backupRecords: BackupRecord[]; surveyRecords: SurveyReportRecord[]; canAccessBackupReport: boolean; canAccessSurveyReport: boolean }) {
  const initialMonth = currentJakartaMonth();
  const initialRange = monthInputRange(initialMonth);
  const [mode, setMode] = useState<FilterMode>("month");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [month, setMonth] = useState(initialMonth);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [exportError, setExportError] = useState("");

  // Sections rendered as children (the administrator's all-data exports) reuse this period.
  const sharedPeriod = useMemo<SharedReportPeriod>(
    () => (mode === "month" ? { mode: "month", month } : { mode: "range", startDate, endDate }),
    [mode, month, startDate, endDate],
  );
  // Where a child section may place its download button, inside the Report Period card.
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const contextValue = useMemo(() => ({ period: sharedPeriod, actionsSlot }), [sharedPeriod, actionsSlot]);
  const showReportCards = !hideInboxReport || canAccessBackupReport || canAccessSurveyReport;

  const filteredTickets = useMemo(
    () => ticketRecords.filter((ticket) => dateMatches(ticket.reportedDate, mode, startDate, endDate, month)),
    [ticketRecords, mode, startDate, endDate, month],
  );

  const filteredBackups = useMemo(
    () => backupRecords.filter((record) => dateMatches(record.submittedAtIso.slice(0, 10), mode, startDate, endDate, month)),
    [backupRecords, mode, startDate, endDate, month],
  );

  const filteredSurveys = useMemo(
    () => surveyRecords.filter((record) => dateMatches(record.submittedDate, mode, startDate, endDate, month)),
    [surveyRecords, mode, startDate, endDate, month],
  );

  const invalidRange = mode === "range" && Boolean(startDate && endDate && startDate > endDate);
  const filterLabel = mode === "month" ? month : `${startDate || "start"}_${endDate || "end"}`;

  async function runExport(type: ExportType, recordCount: number, callback: () => Promise<void>) {
    setExporting(type);
    setExportError("");
    try {
      await callback();
      const auditResult = await recordReportExportAction({ type, mode, startDate, endDate, month, recordCount });
      if (!auditResult.ok) {
        setExportError("The report was downloaded, but its activity log could not be recorded.");
      }
    } catch (error) {
      console.error(
        "Unable to export Excel report.",
        error instanceof Error ? error.message : "Unknown export error.",
      );
      setExportError("The Excel report could not be generated. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  async function exportTroubleshooting() {
    const images: ExcelImageDefinition[] = filteredTickets.flatMap((ticket, rowIndex) => {
      const rowImages: ExcelImageDefinition[] = [];
      if (ticket.workPhotoUrl) {
        rowImages.push({
          rowIndex,
          columnKey: "workPhoto",
          sourceUrl: ticket.workPhotoUrl,
          extension: "jpeg",
          width: 128,
          height: 88,
        });
      }
      if (ticket.clientApproval) {
        rowImages.push({
          rowIndex,
          columnKey: "clientSignature",
          sourceUrl: ticket.clientApproval.signatureUrl,
          extension: "png",
          width: 128,
          height: 70,
        });
      }
      return rowImages;
    });

    await runExport("troubleshooting", filteredTickets.length, () =>
      downloadExcelReport({
        filename: `inbox-report-${filterLabel}.xlsx`,
        sheetName: "Inbox",
        columns: troubleshootingExcelColumns,
        rows: filteredTickets.map((ticket, index) => ({
          number: index + 1,
          id: ticket.id,
          date: excelDate(ticket.reportedDate),
          location: ticket.location,
          requester: ticket.requester,
          division: ticket.division,
          issue: ticket.title,
          category: ticket.category,
          status: issueStatusLabel(ticket.status),
          completionDate: ticket.completionDate ? excelDate(ticket.completionDate) : null,
          completionDays: ticket.completedDays,
          workPhoto: ticket.hasWorkPhoto ? "Available" : "Not available",
          clientSignature: ticket.clientApproval ? "Available" : "Not available",
          approvedBy: ticket.clientApproval?.clientName ?? "",
          approvedAt: ticket.clientApproval
            ? excelDate(ticket.clientApproval.approvedAtIso)
            : null,
          description: ticket.description,
        })),
        images,
      }),
    );
  }

  async function exportBackupUsers() {
    await runExport("backup", filteredBackups.length, () =>
      downloadExcelReport({
        filename: `backup-user-report-${filterLabel}.xlsx`,
        sheetName: "Backup Users",
        columns: backupExcelColumns,
        rows: filteredBackups.map((record, index) => ({
          number: index + 1,
          id: record.id,
          user: record.user,
          division: record.division,
          syncPath: record.syncPath,
          submittedAt: excelDate(record.submittedAtIso),
          status: record.status,
        })),
      }),
    );
  }

  async function exportSurveys() {
    const rows: Array<Record<string, string | number | Date | null>> = [];
    const ratingGroups = new Map<string, {
      survey: string;
      category: SurveyKpiCategory;
      questionIds: Set<string>;
      values: number[];
    }>();
    let rowNumber = 1;
    for (const response of filteredSurveys) {
      if (response.answers.length === 0) {
        rows.push({ number: rowNumber, survey: response.surveyTitle, responseId: response.responseId, submittedAt: excelDate(response.submittedAtIso), client: response.clientName, division: response.division, question: "", questionType: "", kpiCode: "", kpiCategory: "", answer: "", ratingLabel: "", csatResult: "", csatContribution: null, aiStatus: "", aiSentiment: "", aiScore: null, aiConfidence: null, aiSummary: "" });
        rowNumber += 1;
        continue;
      }
      for (const answer of response.answers) {
        const rating = answer.questionType === "linear_scale" && isSurveyRating(answer.value)
          ? answer.value
          : null;
        if (rating !== null && answer.kpiCategory) {
          const key = `${response.surveyId}:${answer.kpiCategory}`;
          const group = ratingGroups.get(key) ?? {
            survey: response.surveyTitle,
            category: answer.kpiCategory,
            questionIds: new Set<string>(),
            values: [],
          };
          group.questionIds.add(answer.questionId);
          group.values.push(rating);
          ratingGroups.set(key, group);
        }
        const kpiDefinition = answer.kpiCategory
          ? SURVEY_KPI_CATEGORIES[answer.kpiCategory]
          : null;
        rows.push({ number: rowNumber, survey: response.surveyTitle, responseId: response.responseId, submittedAt: excelDate(response.submittedAtIso), client: response.clientName, division: response.division, question: answer.questionTitle, questionType: answer.questionType, kpiCode: kpiDefinition?.code ?? "", kpiCategory: kpiDefinition?.label ?? "", answer: surveyAnswerText(answer.value), ratingLabel: rating === null ? "" : SURVEY_RATING_LABELS[rating], csatResult: rating === null ? "" : isSatisfiedRating(rating) ? "Satisfied" : "Not Satisfied", csatContribution: rating === null ? null : isSatisfiedRating(rating) ? 100 : 0, aiStatus: answer.analysis?.status ?? "not_analyzed", aiSentiment: answer.analysis?.label ?? "", aiScore: answer.analysis?.manualScore ?? answer.analysis?.score ?? null, aiConfidence: answer.analysis?.confidencePercent ?? null, aiSummary: answer.analysis?.summary ?? "" });
        rowNumber += 1;
      }
    }
    const kpiRows = Array.from(ratingGroups.values()).map((group, index) => {
      const metrics = calculateSurveyRatingMetrics(group.values);
      const definition = SURVEY_KPI_CATEGORIES[group.category];
      return {
        number: index + 1,
        survey: group.survey,
        kpiCode: definition.code,
        kpiCategory: definition.label,
        questionCount: group.questionIds.size,
        responseCount: metrics.responseCount,
        averageRating: metrics.averageRating,
        satisfiedCount: metrics.satisfiedCount,
        satisfactionScore: metrics.satisfactionScore,
        target: SURVEY_SATISFACTION_TARGET,
        targetAchievement: metrics.targetAchievement,
      };
    });
    await runExport("survey", filteredSurveys.length, () =>
      downloadExcelReport({
        filename: `survey-response-report-${filterLabel}.xlsx`,
        sheetName: "Survey Responses",
        columns: surveyExcelColumns,
        rows,
        additionalSheets: [{
          sheetName: "KPI Summary",
          columns: surveyKpiExcelColumns,
          rows: kpiRows,
        }],
      }),
    );
  }

  return (
    <ReportPeriodProvider value={contextValue}>
    <div className="space-y-5">
      <Card className={`relative overflow-visible p-4 sm:p-5 ${monthPickerOpen ? "z-[60]" : ""}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarRange size={17} className="text-[#3157d5]" /> Report Period</div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Select a period once and apply it to every report type below.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full text-[11px] font-semibold text-slate-600 sm:w-auto">Filter Type
              <select value={mode} onChange={(event) => { const nextMode = event.target.value as FilterMode; setMode(nextMode); if (nextMode !== "month") setMonthPickerOpen(false); }} className="mt-1.5 h-10 w-full min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">
                <option value="month">By Month</option>
                <option value="range">Date Range</option>
              </select>
            </label>

            {mode === "month" ? (
              <MonthPicker value={month} onChange={setMonth} onOpenChange={setMonthPickerOpen} />
            ) : (
              <>
                <label className="w-full text-[11px] font-semibold text-slate-600 sm:w-auto">Start Date
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none" />
                </label>
                <label className="w-full text-[11px] font-semibold text-slate-600 sm:w-auto">End Date
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none" />
                </label>
              </>
            )}
            {children ? <div ref={setActionsSlot} className="w-full sm:w-auto" /> : null}
          </div>
        </div>
        {invalidRange ? <p className="mt-3 text-left text-[11px] font-semibold text-rose-600 sm:text-right">The end date must be on or after the start date.</p> : null}
        {exportError ? <p className="mt-3 text-left text-[11px] font-semibold text-rose-600 sm:text-right">{exportError}</p> : null}
      </Card>

      {showReportCards ? <div className="grid gap-5 lg:grid-cols-2">
        {hideInboxReport ? null : <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Wrench size={20} /></span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{invalidRange ? 0 : filteredTickets.length} records</span>
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Inbox Report</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Troubleshooting and inbox requests handled by IT, from the Head Office and Factory.</p>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500"><FileSpreadsheet size={15} /> Formatted XLSX</div>
            <button disabled={invalidRange || filteredTickets.length === 0 || exporting !== null} onClick={() => void exportTroubleshooting()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white hover:bg-[#2445b5] disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={15} /> {exporting === "troubleshooting" ? "Preparing..." : "Export"}</button>
          </div>
        </Card>}

        {canAccessBackupReport ? <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FolderSync size={20} /></span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{invalidRange ? 0 : filteredBackups.length} records</span>
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Backup User Report</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Registered backup users and their current verification status.</p>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500"><FileSpreadsheet size={15} /> Formatted XLSX</div>
            <button disabled={invalidRange || filteredBackups.length === 0 || exporting !== null} onClick={() => void exportBackupUsers()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white hover:bg-[#2445b5] disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={15} /> {exporting === "backup" ? "Preparing..." : "Export"}</button>
          </div>
        </Card> : null}

        {canAccessSurveyReport ? <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600"><ClipboardCheck size={20} /></span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{invalidRange ? 0 : filteredSurveys.length} responses</span>
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Survey Response Report</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Client feedback, rating, Gemini sentiment, confidence, and answers for every survey question.</p>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500"><FileSpreadsheet size={15} /> Formatted XLSX</div>
            <button disabled={invalidRange || filteredSurveys.length === 0 || exporting !== null} onClick={() => void exportSurveys()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white hover:bg-[#2445b5] disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={15} /> {exporting === "survey" ? "Preparing..." : "Export"}</button>
          </div>
        </Card> : null}
      </div> : null}
      {children}
    </div>
    </ReportPeriodProvider>
  );
}

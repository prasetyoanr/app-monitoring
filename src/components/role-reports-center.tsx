"use client";

import { CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, Download, FileSpreadsheet, Inbox, Layers, LoaderCircle, ScrollText, Wrench, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { previewRoleReportAction, type ReportPreviewSheet } from "@/app/reports/role-actions";
import { MonthPicker, formatMonthLabel } from "@/components/month-picker";
import { useReportActionsSlot, useSharedReportPeriod } from "@/components/report-period-context";
import { Card } from "@/components/ui";
import { reportingPeriodStartForDate, shiftDate } from "@/lib/ga-work-plan";
import { currentJakartaMonth, jakartaDateInput } from "@/lib/jakarta-date";
import { reportTypeDescriptions, reportTypeLabels, usesStaffDatePicker, type ReportPeriodInput, type ReportTone, type RoleReportType } from "@/lib/role-report";

const typeIcons: Record<RoleReportType, LucideIcon> = {
  request: ClipboardList,
  inbox: Inbox,
  ga_activity: CalendarCheck,
  log: ScrollText,
  utility: Wrench,
  all: Layers,
};

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const formatDay = (value: string) => (value ? dayFormat.format(new Date(`${value}T00:00:00Z`)) : "—");

const toneClass: Record<Exclude<ReportTone, "none">, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  wait: "bg-amber-50 text-amber-700 ring-amber-600/20",
  bad: "bg-rose-50 text-rose-700 ring-rose-600/20",
  run: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

const themes = {
  ga: { selected: "border-emerald-600 bg-emerald-50", icon: "bg-emerald-700 text-white", button: "bg-[#004d32] hover:bg-[#003d28]", focus: "focus:border-emerald-500 focus:ring-emerald-100" },
  dark: { selected: "border-indigo-600 bg-indigo-50", icon: "bg-indigo-950 text-white", button: "bg-indigo-950 hover:bg-indigo-900", focus: "focus:border-indigo-500 focus:ring-indigo-100" },
} as const;

const PREVIEW_SHEETS = 3;

export function RoleReportsCenter({
  types,
  members,
  theme = "ga",
  heading,
}: {
  types: RoleReportType[];
  members: Array<{ id: string; name: string }>;
  theme?: keyof typeof themes;
  heading?: string;
}) {
  const style = themes[theme];
  const [type, setType] = useState<RoleReportType>(types[0] ?? "request");
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState(currentJakartaMonth());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewBy, setViewBy] = useState<"date" | "period">("period");
  const [refDate, setRefDate] = useState(jakartaDateInput());
  const [member, setMember] = useState("");
  const [monthOpen, setMonthOpen] = useState(false);
  const [result, setResult] = useState<{ key: string; sheets: ReportPreviewSheet[]; totalRows: number; error: string } | null>(null);

  const showMembers = members.length > 0 && (type === "ga_activity" || type === "all");
  // GA Activity and All use the same date picker as the staff workspace; Utility is a
  // snapshot and needs no period; the others keep month / date range.
  const staffPicker = usesStaffDatePicker(type);
  const snapshot = type === "utility";
  // On the IT reports page the Report Period at the top already applies; reuse it for
  // month / range reports instead of asking for the period a second time.
  const shared = useSharedReportPeriod();
  // On the IT reports page the download button lives in the Report Period card.
  const actionsSlot = useReportActionsSlot();
  const usesSharedPeriod = Boolean(shared) && !staffPicker && !snapshot;
  const rangeIncomplete = snapshot
    ? false
    : staffPicker
      ? !refDate
      : usesSharedPeriod && shared
        ? shared.mode === "range" && (!shared.startDate || !shared.endDate)
        : mode === "range" && (!startDate || !endDate);
  const period = useMemo<ReportPeriodInput>(() => {
    if (snapshot) return { mode: "month", month: currentJakartaMonth() };
    if (staffPicker) return { mode: viewBy, date: refDate };
    if (usesSharedPeriod && shared) return shared;
    return mode === "month" ? { mode: "month", month } : { mode: "range", startDate, endDate };
  }, [snapshot, staffPicker, usesSharedPeriod, shared, viewBy, refDate, mode, month, startDate, endDate]);
  const periodStart = viewBy === "period" ? reportingPeriodStartForDate(refDate) : refDate;
  const step = viewBy === "period" ? 7 : 1;
  // One key per set of choices. The preview is "loading" until a result for the current key arrives.
  const requestKey = rangeIncomplete ? "" : JSON.stringify([type, period, showMembers ? member : ""]);

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void previewRoleReportAction({
        type,
        period,
        memberId: showMembers ? member : undefined,
      }).then((response) => {
        if (cancelled) return;
        setResult(response.ok
          ? { key: requestKey, sheets: response.data.sheets, totalRows: response.data.totalRows, error: "" }
          : { key: requestKey, sheets: [], totalRows: 0, error: response.error });
      }).catch(() => {
        if (!cancelled) setResult({ key: requestKey, sheets: [], totalRows: 0, error: "The preview could not be loaded." });
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestKey, type, period, member, showMembers]);

  const current = result && result.key === requestKey ? result : null;
  const loading = Boolean(requestKey) && !current;
  const error = rangeIncomplete ? (usesSharedPeriod ? "Choose both dates in Report Period above to see the report." : "Choose both dates to see the report.") : current?.error ?? "";
  const sheets = current?.sheets ?? [];
  const totalRows = current?.totalRows ?? 0;

  const canDownload = !loading && !error && totalRows > 0;
  const inputClass = `mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 ${style.focus}`;

  const periodEnd = shiftDate(periodStart, 6);
  const periodCaption = snapshot
    ? "Current snapshot"
    : staffPicker
      ? (viewBy === "date" ? formatDay(refDate) : `${formatDay(periodStart)} – ${formatDay(periodEnd)}`)
      : period.mode === "month"
        ? formatMonthLabel(period.month)
        : period.mode === "range"
          ? `${formatDay(period.startDate)} – ${formatDay(period.endDate)}`
          : "";
  const downloadForm = (
    <form method="post" action="/reports/export" className={actionsSlot ? "flex flex-col items-stretch gap-1.5 sm:items-end" : "shrink-0"}>
    {actionsSlot ? <p className="text-[10px] font-semibold text-slate-500 sm:text-right">{reportTypeLabels[type]} · {periodCaption}</p> : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mode" value={period.mode} />
      <input type="hidden" name="date" value={staffPicker ? refDate : ""} />
      <input type="hidden" name="month" value={period.mode === "month" ? period.month : month} />
      <input type="hidden" name="startDate" value={period.mode === "range" ? period.startDate : startDate} />
      <input type="hidden" name="endDate" value={period.mode === "range" ? period.endDate : endDate} />
      <input type="hidden" name="member" value={showMembers ? member : ""} />
      <button type="submit" disabled={!canDownload} className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-auto ${style.button}`}>
        <Download size={15} /> Download Excel
      </button>
    </form>
  );

  return (
    <section className="space-y-5" aria-label={heading ?? "Reports"}>
      {heading ? <h2 className="text-sm font-bold text-slate-800">{heading}</h2> : null}

      <div className={`grid gap-3 ${types.length >= 5 ? "sm:grid-cols-2 xl:grid-cols-3" : types.length === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : types.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} role="radiogroup" aria-label="Report type">
        {types.map((item) => {
          const Icon = typeIcons[item];
          const selected = type === item;
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setType(item)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${selected ? style.selected : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${selected ? style.icon : "bg-slate-100 text-slate-500"}`}><Icon size={17} /></span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-900">{reportTypeLabels[item]}</span>
                <span className="mt-1 block text-[11px] leading-4 text-slate-500">{reportTypeDescriptions[item]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Card className={`relative overflow-visible p-4 sm:p-5 ${monthOpen ? "z-[60]" : ""}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {snapshot ? (
            <p className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">Utility is a snapshot of the current state (Admin Operations and System Health), so no period is needed.</p>
          ) : staffPicker ? (
            <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-end">
              <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,10rem)]">
                <label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">View by
                  <select value={viewBy} onChange={(event) => setViewBy(event.target.value as "date" | "period")} className={inputClass}>
                    <option value="date">Date</option>
                    <option value="period">Reporting period</option>
                  </select>
                </label>
                <label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Reference date
                  <input type="date" value={refDate} required aria-label="Choose report reference date" onChange={(event) => setRefDate(event.target.value)} className={inputClass} />
                </label>
              </div>
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-1.5">
                <button type="button" disabled={!refDate} onClick={() => setRefDate(shiftDate(refDate, -step))} aria-label={viewBy === "date" ? "Previous date" : "Previous reporting period"} className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40"><ChevronLeft size={15} /></button>
                <div className="min-w-44 flex-1 px-1 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{viewBy === "date" ? "Selected date" : "Friday to Thursday"}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-700">{refDate ? (viewBy === "date" ? formatDay(refDate) : `${formatDay(periodStart)} – ${formatDay(shiftDate(periodStart, 6))}`) : "Choose a date"}</p>
                </div>
                <button type="button" disabled={!refDate} onClick={() => setRefDate(shiftDate(refDate, step))} aria-label={viewBy === "date" ? "Next date" : "Next reporting period"} className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-40"><ChevronRight size={15} /></button>
              </div>
            </div>
          ) : usesSharedPeriod ? (
            <p className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">This report uses the <strong className="font-semibold text-slate-700">Report Period</strong> selected above.</p>
          ) : (
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Period
                <select value={mode} onChange={(event) => setMode(event.target.value as "month" | "range")} className={inputClass}>
                  <option value="month">By month</option>
                  <option value="range">Date range</option>
                </select>
              </label>
              {mode === "month" ? (
                <div className="sm:col-span-1 lg:col-span-2"><MonthPicker value={month} onChange={setMonth} onOpenChange={setMonthOpen} /></div>
              ) : (
                <>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">From
                    <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">To
                    <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />
                  </label>
                </>
              )}
            </div>
          )}
          {showMembers ? (
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:w-64">GA member
              <select value={member} onChange={(event) => setMember(event.target.value)} className={inputClass}>
                <option value="">All members (one tab each)</option>
                {members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          ) : null}
          {actionsSlot ? null : downloadForm}
        </div>
      </Card>

      <div aria-live="polite">
        {loading ? (
          <Card className="grid place-items-center gap-2 p-10 text-center"><LoaderCircle className="animate-spin text-slate-400" size={22} /><p className="text-xs text-slate-500">Loading preview…</p></Card>
        ) : error ? (
          <Card className="p-8 text-center"><p role="alert" className="text-xs font-semibold text-rose-600">{error}</p></Card>
        ) : totalRows === 0 ? (
          <Card className="grid place-items-center gap-2 p-10 text-center"><FileSpreadsheet className="text-slate-300" size={28} /><p className="text-sm font-bold text-slate-700">No records in this period</p><p className="max-w-sm text-xs text-slate-500">Try another month or a wider date range.</p></Card>
        ) : (
          <div className="space-y-5">
            <p className="text-[11px] text-slate-500">
              The file will have <strong className="font-semibold text-slate-700">{sheets.length} {sheets.length === 1 ? "tab" : "tabs"}</strong>
              {sheets.length > 1 ? `: ${sheets.map((sheet) => sheet.name).join(" · ")}` : ""} and <strong className="font-semibold text-slate-700">{totalRows.toLocaleString("en-US")} records</strong>.
            </p>
            {sheets.slice(0, PREVIEW_SHEETS).map((sheet) => (
              <Card key={sheet.name} className="overflow-hidden">
                <div className="border-b border-slate-100 p-4 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{sheet.title}</h3>
                    <span className="text-[10px] font-semibold text-slate-400">Tab “{sheet.name}” · {sheet.totalRows.toLocaleString("en-US")} rows</span>
                  </div>
                  {sheet.summary.length ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      {sheet.summary.map((item) => (
                        <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2">
                          <dt className="text-[10px] font-semibold text-slate-400">{item.label}</dt>
                          <dd className="mt-0.5 text-base font-bold tabular-nums text-slate-900">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <tr>{sheet.columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-2.5 ${column.align === "center" ? "text-center" : ""}`}>{column.header}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sheet.rows.map((row, rowIndex) => {
                        const tone = sheet.tones[rowIndex] ?? "none";
                        return (
                          <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/50">
                            {sheet.columns.map((column) => {
                              const value = row[column.key];
                              const text = value === null || value === undefined ? "—" : String(value);
                              return (
                                <td key={column.key} className={`max-w-[18rem] px-4 py-2.5 text-slate-700 ${column.align === "center" ? "text-center" : ""} ${column.wrap ? "" : "whitespace-nowrap"} ${column.key === "id" ? "font-mono text-[11px] text-slate-500" : ""}`}>
                                  {column.status && tone !== "none"
                                    ? <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${toneClass[tone]}`}>{text}</span>
                                    : <span className={column.wrap ? "line-clamp-2" : "block truncate"} title={text}>{text}</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {sheet.totalRows > sheet.rows.length ? <p className="border-t border-slate-100 px-5 py-2.5 text-[10px] text-slate-400">Showing {sheet.rows.length} of {sheet.totalRows.toLocaleString("en-US")} rows. The Excel file has all of them.</p> : null}
              </Card>
            ))}
            {sheets.length > PREVIEW_SHEETS ? <p className="text-[11px] text-slate-500">+ {sheets.length - PREVIEW_SHEETS} more {sheets.length - PREVIEW_SHEETS === 1 ? "tab" : "tabs"} in the Excel file.</p> : null}
          </div>
        )}
      </div>
      {actionsSlot ? createPortal(downloadForm, actionsSlot) : null}
    </section>
  );
}

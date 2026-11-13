"use client";

import { CalendarCheck, ClipboardList, Download, FileSpreadsheet, Inbox, Layers, LoaderCircle, ScrollText, Wrench, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { previewRoleReportAction, type ReportPreviewSheet } from "@/app/reports/role-actions";
import { MonthPicker, formatMonthLabel } from "@/components/month-picker";
import { useReportActionsSlot, useSharedReportPeriod } from "@/components/report-period-context";
import { Card } from "@/components/ui";
import { currentJakartaMonth } from "@/lib/jakarta-date";
import { REPORT_GROUPS, accountInReportGroup, parseReportGroup, reportGroupLabels, reportTypeDescriptions, reportTypeLabels, usesStaffDatePicker, type ReportGroup, type ReportPeriodInput, type ReportTone, type RoleReportType } from "@/lib/role-report";

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

// Preview dropdown value that lists every tab instead of one.
const ALL_TABS = "__all__";

export function RoleReportsCenter({
  types,
  members,
  canPickGroup = false,
  theme = "ga",
  heading,
}: {
  types: RoleReportType[];
  members: Array<{ id: string; name: string; role: string; isIt: boolean }>;
  /** Supervisors can narrow the report to one account group or member. */
  canPickGroup?: boolean;
  theme?: keyof typeof themes;
  heading?: string;
}) {
  const style = themes[theme];
  const compactGa = theme === "ga";
  const [type, setType] = useState<RoleReportType>(types[0] ?? "request");
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState(currentJakartaMonth());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewBy, setViewBy] = useState<"range" | "month">("month");
  const [scope, setScope] = useState("group:all");
  const [itGroup, setItGroup] = useState<ReportGroup>("all");
  const [itMember, setItMember] = useState("");
  const [monthOpen, setMonthOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState("");
  const [pageState, setPageState] = useState<{ key: string; pages: Record<string, number> }>({ key: "", pages: {} });
  const [result, setResult] = useState<{ key: string; sheets: ReportPreviewSheet[]; totalRows: number; error: string } | null>(null);

  // One choice controls the exported accounts. The preview sheet below only changes the view.
  let group: ReportGroup = "all";
  let member = "";
  if (canPickGroup) {
    if (compactGa) {
      if (scope.startsWith("group:")) group = parseReportGroup(scope.slice(6));
      if (scope.startsWith("member:")) member = scope.slice(7);
    } else {
      group = itGroup;
      if (type === "ga_activity" || type === "all") member = itMember;
    }
  }
  const scopeLabel = member ? members.find((item) => item.id === member)?.name ?? "Selected member" : reportGroupLabels[group];
  const groupMembers = useMemo(() => members.filter((item) => accountInReportGroup(item, itGroup)), [members, itGroup]);
  // GA Activity and All use the same month/range picker as the staff workspace; Utility is a
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
      ? viewBy === "range" && (!startDate || !endDate)
      : usesSharedPeriod && shared
        ? shared.mode === "range" && (!shared.startDate || !shared.endDate)
        : mode === "range" && (!startDate || !endDate);
  const period = useMemo<ReportPeriodInput>(() => {
    if (snapshot) return { mode: "month", month: currentJakartaMonth() };
    if (staffPicker) return viewBy === "month" ? { mode: "month", month } : { mode: "range", startDate, endDate };
    if (usesSharedPeriod && shared) return shared;
    return mode === "month" ? { mode: "month", month } : { mode: "range", startDate, endDate };
  }, [snapshot, staffPicker, usesSharedPeriod, shared, viewBy, mode, month, startDate, endDate]);
  // One key per set of choices. The preview is "loading" until a result for the current key arrives.
  const filterKey = rangeIncomplete ? "" : JSON.stringify([type, period, member, group]);
  const pages = useMemo(() => pageState.key === filterKey ? pageState.pages : {}, [pageState, filterKey]);
  const requestKey = filterKey ? JSON.stringify([filterKey, pages]) : "";

  const changePage = (sheet: ReportPreviewSheet, page: number) => {
    if (!filterKey || page < 1 || page > sheet.totalPages) return;
    setPageState({ key: filterKey, pages: { ...pages, [sheet.name]: page } });
  };

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void previewRoleReportAction({
        type,
        period,
        memberId: member || undefined,
        group: canPickGroup ? group : undefined,
        pages,
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
  }, [requestKey, type, period, member, canPickGroup, group, pages]);

  const current = result && result.key === requestKey ? result : null;
  const loading = Boolean(requestKey) && !current;
  const error = rangeIncomplete ? (usesSharedPeriod ? "Choose both dates in Report Period above to see the report." : "Choose both dates to see the report.") : current?.error ?? "";
  const sheets = current?.sheets ?? [];
  const totalRows = current?.totalRows ?? 0;
  // Open a data sheet first when a new report also contains an Excel summary sheet.
  const showAllTabs = previewTab === ALL_TABS && sheets.length > 1;
  const selectedSheet = sheets.find((sheet) => sheet.name === previewTab) ?? (compactGa ? sheets.find((sheet) => sheet.name !== "Summary") : undefined) ?? sheets[0];
  const shownSheets = showAllTabs ? sheets : selectedSheet ? [selectedSheet] : [];

  const canDownload = !loading && !error && totalRows > 0;
  const inputClass = `mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 ${style.focus}`;

  const periodCaption = snapshot
    ? "Current snapshot"
    : staffPicker
      ? (viewBy === "month" ? formatMonthLabel(month) : `${formatDay(startDate)} – ${formatDay(endDate)}`)
      : period.mode === "month"
        ? formatMonthLabel(period.month)
        : period.mode === "range"
          ? `${formatDay(period.startDate)} – ${formatDay(period.endDate)}`
          : "";
  const downloadForm = (
    <form method="post" action="/reports/export" className={actionsSlot ? "flex flex-col items-stretch gap-1.5 sm:items-end" : "shrink-0"}>
    {actionsSlot ? <p className="text-[10px] font-semibold text-slate-500 sm:text-right">{reportTypeLabels[type]}{canPickGroup ? ` · ${scopeLabel}` : ""} · {periodCaption}</p> : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mode" value={period.mode} />
      <input type="hidden" name="month" value={period.mode === "month" ? period.month : month} />
      <input type="hidden" name="startDate" value={period.mode === "range" ? period.startDate : startDate} />
      <input type="hidden" name="endDate" value={period.mode === "range" ? period.endDate : endDate} />
      <input type="hidden" name="member" value={member} />
      <input type="hidden" name="group" value={canPickGroup ? group : "all"} />
      <button type="submit" disabled={!canDownload} className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-auto ${style.button}`}>
        <Download size={15} /> Download Excel
      </button>
    </form>
  );

  return (
    <section className="space-y-5" aria-label={heading ?? "Reports"}>
      {heading ? <h2 className="text-sm font-bold text-slate-800">{heading}</h2> : null}

      <div className={compactGa
        ? "flex flex-wrap gap-2"
        : `grid gap-3 ${types.length >= 5 ? "sm:grid-cols-2 xl:grid-cols-3" : types.length === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : types.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} role="radiogroup" aria-label="Report type">
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
              className={`${compactGa ? "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left" : "flex items-start gap-3 rounded-2xl border p-4 text-left"} transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${selected ? style.selected : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <span className={`grid shrink-0 place-items-center ${compactGa ? "size-6 rounded-md" : "size-9 rounded-xl"} ${selected ? style.icon : "bg-slate-100 text-slate-500"}`}><Icon size={compactGa ? 14 : 17} /></span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-900">{reportTypeLabels[item]}</span>
                {compactGa ? null : <span className="mt-1 block text-[11px] leading-4 text-slate-500">{reportTypeDescriptions[item]}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {compactGa ? <p className="text-[11px] text-slate-500">{reportTypeDescriptions[type]}</p> : null}

      <Card className={`relative overflow-visible p-4 sm:p-5 ${monthOpen ? "z-[60]" : ""}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {snapshot ? (
            <p className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">Utility is a snapshot of the current state (Admin Operations and System Health), so no period is needed.</p>
          ) : staffPicker ? (
            <div className={`grid min-w-0 flex-1 items-end gap-3 ${viewBy === "month" ? "sm:grid-cols-[minmax(0,10rem)_minmax(0,16rem)]" : "sm:grid-cols-2 xl:grid-cols-[minmax(0,10rem)_minmax(0,12rem)_minmax(0,12rem)]"}`}>
                <label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">View by
                  <select value={viewBy} onChange={(event) => setViewBy(event.target.value as "range" | "month")} className={inputClass}>
                    <option value="month">Month</option>
                    <option value="range">Date range</option>
                  </select>
                </label>
                {viewBy === "range" ? <><label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Start date<input type="date" value={startDate} required max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></label><label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">End date<input type="date" value={endDate} required min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className={inputClass} /></label></> : null}
              {viewBy === "month" ? (
                <div className="min-w-0"><MonthPicker value={month} onChange={setMonth} onOpenChange={setMonthOpen} shadowless={compactGa} /></div>
              ) : null}
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
                <div className="sm:col-span-1 lg:col-span-2"><MonthPicker value={month} onChange={setMonth} onOpenChange={setMonthOpen} shadowless={compactGa} /></div>
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
          {canPickGroup && compactGa ? (
            <label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:w-64">Report for
              <select value={scope} onChange={(event) => setScope(event.target.value)} className={inputClass}>
                <optgroup label="Account groups">
                  {REPORT_GROUPS.map((item) => <option key={item} value={`group:${item}`}>{reportGroupLabels[item]}</option>)}
                </optgroup>
                {members.length > 0 ? <optgroup label="Individual members">
                  {members.map((item) => <option key={item.id} value={`member:${item.id}`}>{item.name}</option>)}
                </optgroup> : null}
              </select>
            </label>
          ) : null}
          {canPickGroup && !compactGa ? <>
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:w-56">Account group
              <select value={itGroup} onChange={(event) => { const next = event.target.value as ReportGroup; setItGroup(next); const chosen = members.find((item) => item.id === itMember); if (chosen && !accountInReportGroup(chosen, next)) setItMember(""); }} className={inputClass}>
                {REPORT_GROUPS.map((item) => <option key={item} value={item}>{reportGroupLabels[item]}</option>)}
              </select>
            </label>
            {(type === "ga_activity" || type === "all") && members.length > 0 ? (
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:w-64">GA member
                <select value={itMember} onChange={(event) => setItMember(event.target.value)} className={inputClass}>
                  <option value="">All members (one tab each)</option>
                  {groupMembers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            ) : null}
          </> : null}
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
          <div className={compactGa ? "space-y-3" : "space-y-5"}>
            {compactGa ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <h2 className="text-xs font-bold text-slate-800">Preview</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">{totalRows.toLocaleString("en-US")} records · {sheets.length} {sheets.length === 1 ? "sheet" : "sheets"} in Excel</p>
              </div>
              {sheets.length > 1 ? (
                <label className="min-w-0 text-[10px] font-semibold text-slate-500 sm:w-64">Show sheet
                  <select value={showAllTabs ? ALL_TABS : shownSheets[0]?.name ?? ""} onChange={(event) => setPreviewTab(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500">
                    <option value={ALL_TABS}>All sheets</option>
                    {sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name} · {sheet.totalRows.toLocaleString("en-US")}</option>)}
                  </select>
                </label>
              ) : null}
            </div> : <>
              <p className="text-[11px] text-slate-500">The file will have <strong className="font-semibold text-slate-700">{sheets.length} {sheets.length === 1 ? "tab" : "tabs"}</strong>{sheets.length > 1 ? `: ${sheets.map((sheet) => sheet.name).join(" · ")}` : ""} and <strong className="font-semibold text-slate-700">{totalRows.toLocaleString("en-US")} records</strong>.</p>
              {sheets.length > 1 ? <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview tab
                <select value={showAllTabs ? ALL_TABS : shownSheets[0]?.name ?? ""} onChange={(event) => setPreviewTab(event.target.value)} className={inputClass}>
                  <option value={ALL_TABS}>All tabs · {sheets.length} tabs</option>
                  {sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name} · {sheet.totalRows.toLocaleString("en-US")} {sheet.totalRows === 1 ? "row" : "rows"}</option>)}
                </select>
              </label> : null}
            </>}
            {shownSheets.map((shownSheet) => (
            <Card key={shownSheet.name} className="overflow-hidden">
              <div className="border-b border-slate-100 p-4 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{shownSheet.title}</h3>
                  <span className="text-[10px] font-semibold text-slate-400">Tab “{shownSheet.name}” · {shownSheet.totalRows.toLocaleString("en-US")} rows</span>
                </div>
                {shownSheet.summary.length ? (
                  <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {shownSheet.summary.map((item) => (
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
                    <tr>{shownSheet.columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-2.5 ${column.align === "center" ? "text-center" : ""}`}>{column.header}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shownSheet.rows.map((row, rowIndex) => {
                      const tone = shownSheet.tones[rowIndex] ?? "none";
                      return (
                        <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/50">
                          {shownSheet.columns.map((column) => {
                            const value = row[column.key];
                            const text = value === null || value === undefined ? "—" : String(value);
                            return (
                              <td key={column.key} className={`max-w-[18rem] px-4 py-2.5 text-slate-700 ${column.align === "center" ? "text-center" : ""} ${column.wrap ? "" : "whitespace-nowrap"}`}>
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
              {shownSheet.totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500 sm:px-5">
                  <span>Showing {shownSheet.startRow + 1}–{shownSheet.startRow + shownSheet.rows.length} of {shownSheet.totalRows.toLocaleString("en-US")} rows</span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={shownSheet.page === 1} onClick={() => changePage(shownSheet, shownSheet.page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40">Previous</button>
                    <span className="tabular-nums">Page {shownSheet.page} of {shownSheet.totalPages}</span>
                    <button type="button" disabled={shownSheet.page === shownSheet.totalPages} onClick={() => changePage(shownSheet, shownSheet.page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-40">Next</button>
                  </div>
                </div>
              ) : null}
            </Card>
            ))}
          </div>
        )}
      </div>
      {actionsSlot ? createPortal(downloadForm, actionsSlot) : null}
    </section>
  );
}

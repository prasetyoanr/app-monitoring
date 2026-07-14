"use client";

import { CalendarRange, Download, FileSpreadsheet, FolderSync, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import type { BackupRecord, TicketRecord } from "@/data/types";

type FilterMode = "range" | "month";

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateMatches(date: string, mode: FilterMode, startDate: string, endDate: string, month: string) {
  if (mode === "month") return date.slice(0, 7) === month;
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

export function ReportsCenter({ ticketRecords, backupRecords }: { ticketRecords: TicketRecord[]; backupRecords: BackupRecord[] }) {
  const [mode, setMode] = useState<FilterMode>("month");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-31");
  const [month, setMonth] = useState("2026-07");

  const filteredTickets = useMemo(
    () => ticketRecords.filter((ticket) => dateMatches(ticket.reportedDate, mode, startDate, endDate, month)),
    [ticketRecords, mode, startDate, endDate, month],
  );

  const filteredBackups = useMemo(
    () => backupRecords.filter((record) => dateMatches(record.lastBackupIso.slice(0, 10), mode, startDate, endDate, month)),
    [backupRecords, mode, startDate, endDate, month],
  );

  const invalidRange = mode === "range" && Boolean(startDate && endDate && startDate > endDate);
  const filterLabel = mode === "month" ? month : `${startDate || "start"}_${endDate || "end"}`;

  function exportTroubleshooting() {
    const rows: Array<Array<string | number | null>> = [
      ["No.", "ID", "Date", "Location", "Requester", "Division", "Issue", "Category", "Priority", "Status", "Completion Time (Days)", "Description", "Resolution Summary"],
      ...filteredTickets.map((ticket, index) => [
        index + 1,
        ticket.id,
        ticket.reportedAt,
        ticket.location,
        ticket.requester,
        ticket.division,
        ticket.title,
        ticket.category,
        ticket.priority,
        ticket.status,
        ticket.completedDays,
        ticket.description,
        ticket.resolution,
      ]),
    ];
    downloadCsv(`troubleshooting-report-${filterLabel}.csv`, rows);
  }

  function exportBackupUsers() {
    const rows: Array<Array<string | number | null>> = [
      ["No.", "ID", "User", "Sync Folder Path", "Last Backup", "Status"],
      ...filteredBackups.map((record, index) => [
        index + 1,
        record.id,
        record.user,
        record.syncPath,
        record.lastBackup,
        record.status,
      ]),
    ];
    downloadCsv(`backup-user-report-${filterLabel}.csv`, rows);
  }

  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarRange size={17} className="text-[#3157d5]" /> Report Period</div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Select a period once and apply it to every report type below.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full text-[11px] font-semibold text-slate-600 sm:w-auto">Filter Type
              <select value={mode} onChange={(event) => setMode(event.target.value as FilterMode)} className="mt-1.5 h-10 w-full min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">
                <option value="month">By Month</option>
                <option value="range">Date Range</option>
              </select>
            </label>

            {mode === "month" ? (
              <label className="w-full text-[11px] font-semibold text-slate-600 sm:w-auto">Month
                <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1.5 h-10 w-full min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none" />
              </label>
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
          </div>
        </div>
        {invalidRange ? <p className="mt-3 text-left text-[11px] font-semibold text-rose-600 sm:text-right">The end date must be on or after the start date.</p> : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Wrench size={20} /></span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{invalidRange ? 0 : filteredTickets.length} records</span>
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Troubleshooting Report</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Issue handling activities from the Head Office and Factory.</p>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500"><FileSpreadsheet size={15} /> CSV Format</div>
            <button disabled={invalidRange || filteredTickets.length === 0} onClick={exportTroubleshooting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white hover:bg-[#2445b5] disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={15} /> Export</button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FolderSync size={20} /></span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{invalidRange ? 0 : filteredBackups.length} records</span>
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Backup User Report</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Synced user folder records and their latest backup status.</p>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500"><FileSpreadsheet size={15} /> CSV Format</div>
            <button disabled={invalidRange || filteredBackups.length === 0} onClick={exportBackupUsers} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white hover:bg-[#2445b5] disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={15} /> Export</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

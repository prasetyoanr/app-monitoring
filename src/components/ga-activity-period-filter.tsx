"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { MonthPicker } from "@/components/month-picker";

type ActivityPeriodMode = "month" | "date" | "range";

const filterDateFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function FilterDateField({ label, name, value, onChange }: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="col-span-2 min-w-0 text-center text-[10px] font-semibold text-slate-500 sm:w-44">
      {label}
      <span className="relative mt-1 flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        <span className="truncate">{value ? filterDateFormat.format(new Date(`${value}T00:00:00Z`)) : "Select date"}</span>
        <CalendarDays size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
        <input name={name} type="date" required value={value} onChange={(event) => onChange(event.target.value)} onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch { /* The native click can still open the picker. */ } }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </span>
    </label>
  );
}

export function GaActivityPeriodFilter({
  initialMode,
  initialMonth,
  initialStartDate,
  initialEndDate,
  memberId,
  query,
  tab,
}: {
  initialMode: ActivityPeriodMode;
  initialMonth: string;
  initialStartDate: string;
  initialEndDate: string;
  memberId: string;
  query: string;
  tab: "plan" | "inbox";
}) {
  const [mode, setMode] = useState(initialMode);
  const [month, setMonth] = useState(initialMonth);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const dateClass = "mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <form method="get" className="grid min-w-0 grid-cols-2 items-end gap-2 pb-3 sm:flex sm:items-end">
      <input type="hidden" name="member" value={memberId} />
      {query ? <input type="hidden" name="q" value={query} /> : null}
      {tab === "inbox" ? <input type="hidden" name="tab" value="inbox" /> : null}

      <label className="min-w-0 text-center text-[10px] font-semibold text-slate-500 sm:w-32">{tab === "plan" ? "Created / updated" : "Reported date"}
        <select name="mode" value={mode} onChange={(event) => setMode(event.target.value as ActivityPeriodMode)} className={dateClass}>
          <option value="month">Month</option>
          <option value="date">Single date</option>
          <option value="range">Date range</option>
        </select>
      </label>

      {mode === "month" ? (
        <div className="min-w-0 sm:w-40">
          <MonthPicker value={month} onChange={setMonth} compact />
          <input type="hidden" name="month" value={month} />
        </div>
      ) : mode === "date" ? (
        <FilterDateField label="Date" name="date" value={startDate} onChange={setStartDate} />
      ) : (
        <>
          <FilterDateField label="From" name="date" value={startDate} onChange={(next) => { setStartDate(next); if (endDate && next > endDate) setEndDate(next); }} />
          <FilterDateField label="To" name="end" value={endDate} onChange={(next) => { setEndDate(next); if (startDate && next < startDate) setStartDate(next); }} />
        </>
      )}

      <button type="submit" className="col-span-2 h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:col-auto">Apply</button>
    </form>
  );
}

"use client";

import { useState } from "react";

import { MonthPicker } from "@/components/month-picker";

type ActivityPeriodMode = "month" | "date" | "range";

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

      <label className="min-w-0 text-center text-[10px] font-semibold text-slate-500 sm:w-32">{tab === "plan" ? "Created date" : "Reported date"}
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
        <label className="min-w-0 text-center text-[10px] font-semibold text-slate-500 sm:w-32">Date
          <input name="date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className={dateClass} />
        </label>
      ) : (
        <>
          <label className="min-w-0 text-center text-[10px] font-semibold text-slate-500 sm:w-32">From
            <input name="date" type="date" required value={startDate} onChange={(event) => { const next = event.target.value; setStartDate(next); if (endDate && next > endDate) setEndDate(next); }} className={dateClass} />
          </label>
          <label className="min-w-0 text-center text-[10px] font-semibold text-slate-500 sm:w-32">To
            <input name="end" type="date" required value={endDate} onChange={(event) => { const next = event.target.value; setEndDate(next); if (startDate && next < startDate) setStartDate(next); }} className={dateClass} />
          </label>
        </>
      )}

      <button type="submit" className="col-span-2 h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:col-auto">Apply</button>
    </form>
  );
}

"use client";

import { Inbox, Search } from "lucide-react";
import { useState } from "react";

import type { GaMemberInboxRecord } from "@/data/ga-workspace";
import { Card } from "@/components/ui";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function statusTone(status: string) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
  if (status === "In Progress") return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
  if (status === "Reopened") return "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20";
  return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15";
}

function inboxEdge(status: string) {
  if (status === "Completed") return "border-emerald-500";
  if (status === "In Progress") return "border-amber-400";
  if (status === "Reopened") return "border-orange-500";
  return "border-slate-200";
}

export function GaMemberInboxCard({ inbox }: { inbox: GaMemberInboxRecord[] }) {
  const [search, setSearch] = useState("");
  const needle = search.trim().toLocaleLowerCase("id-ID");
  const visible = needle
    ? inbox.filter((item) => `${item.id} ${item.title} ${item.location} ${item.status}`.toLocaleLowerCase("id-ID").includes(needle))
    : inbox;

  return <Card className="overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Inbox size={17} /></span><div><h2 className="text-sm font-bold text-slate-900">Staff Inbox</h2><p className="mt-0.5 text-[10px] text-slate-500">Assigned GA requests · {inbox.length} total</p></div></div>
      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold text-white tabular-nums">{visible.length} shown</span>
    </div>
    <label className="relative block border-b border-slate-100 px-4 py-3 sm:px-5"><span className="sr-only">Search staff inbox</span><Search size={14} className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 sm:left-8" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request, location, or status" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-indigo-400" /></label>
    {visible.length ? <div className="divide-y divide-slate-100">{visible.map((item) => <article key={item.id} className={`border-l-4 p-4 transition hover:bg-slate-50 sm:px-5 ${inboxEdge(item.status)}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-semibold text-slate-400">{item.id} · {dateFormat.format(new Date(item.reportedAt))}</p><h3 className="mt-1.5 text-xs font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-[10px] text-slate-500">{item.location} · {item.priority} priority</p></div><span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-bold ${statusTone(item.status)}`}>{item.status}</span></div></article>)}</div> : <div className="px-5 py-12 text-center"><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Inbox size={20} /></span><p className="mt-3 text-sm font-bold text-slate-700">{search ? "No matching requests" : "Inbox is clear"}</p><p className="mt-1 text-xs text-slate-400">{search ? "Try another search term." : "No assigned GA requests for this staff."}</p></div>}
  </Card>;
}

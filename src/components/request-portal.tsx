"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Landmark,
  MapPin,
  Plus,
  Search,
  Info,
  Clock3,
  CheckCircle2,
  CircleX,
  TicketCheck,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Card, StatusBadge } from "@/components/ui";
import type { TicketRecord } from "@/data/types";
import { requestWorkflowLabel, ticketStatusLabel } from "@/lib/request-workflow";

import { requestHistoryGroup } from "@/lib/request-history";

const historyFilters = [
  { key: "all", label: "All", icon: TicketCheck },
  { key: "active", label: "Active", icon: Clock3 },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: CircleX },
] as const;

function statusTone(status: TicketRecord["status"]): "green" | "blue" | "amber" | "red" | "gray" {
  if (status === "Completed") return "green";
  if (status === "In Progress") return "blue";
  if (status === "Reopened") return "amber";
  if (status === "New") return "green";
  return "gray";
}

function formatFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

const portalThemes = {
  ga: {
    hero: "bg-gradient-to-br from-[#123e35] via-[#165446] to-[#216f5d] shadow-emerald-950/10",
    eyebrow: "text-emerald-200",
    body: "text-emerald-50/85",
    meta: "text-emerald-100",
    dot: "bg-emerald-300",
    cta: "bg-white text-emerald-900 hover:bg-emerald-50",
    notice: "text-emerald-50",
    focus: "focus:border-emerald-500 focus:ring-emerald-100",
    outline: "focus-visible:outline-emerald-600",
    filterOn: "border-emerald-200 bg-emerald-50 text-emerald-800",
    countOn: "text-emerald-800",
    link: "text-emerald-700 hover:bg-emerald-50",
  },
  // IT: follows the IT navbar (indigo-950) with the yellow accent.
  it: {
    hero: "bg-indigo-950 shadow-indigo-950/20",
    eyebrow: "text-amber-300",
    body: "text-indigo-100/85",
    meta: "text-indigo-200",
    dot: "bg-amber-400",
    cta: "bg-amber-400 text-indigo-950 hover:bg-amber-300",
    notice: "text-indigo-100",
    focus: "focus:border-indigo-500 focus:ring-indigo-100",
    outline: "focus-visible:outline-indigo-600",
    filterOn: "border-indigo-200 bg-indigo-50 text-indigo-900",
    countOn: "text-indigo-900",
    link: "text-indigo-700 hover:bg-indigo-50",
  },
} as const;

function getDivisionIcon(name: string) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("finance") || normalizedName.includes("keuangan")) return Landmark;
  if (normalizedName.includes("human") || /(^|\s)hr(\s|$)/.test(normalizedName)) return UsersRound;
  if (normalizedName.includes("teknologi") || normalizedName.includes("informatika") || /(^|\s)it(\s|$)/.test(normalizedName)) return Wrench;
  return Building2;
}

export function RequestPortal({
  initialRecords,
  division,
  requestHref,
  unavailableReason,
  theme = "ga",
}: {
  initialRecords: TicketRecord[];
  division: string | null;
  requestHref: string | null;
  unavailableReason: string | null;
  theme?: keyof typeof portalThemes;
}) {
  const t = portalThemes[theme];
  const [filter, setFilter] = useState<(typeof historyFilters)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const selectedDetailRecord = initialRecords.find((record) => record.id === selectedDetailId) ?? null;
  const counts = { all: initialRecords.length, active: 0, completed: 0, rejected: 0 };
  for (const record of initialRecords) counts[requestHistoryGroup(record)] += 1;
  const query = search.trim().toLowerCase();
  const visibleRecords = initialRecords.filter((record) =>
    (filter === "all" || requestHistoryGroup(record) === filter) &&
    (!query || [record.id, record.title, record.location, record.serviceDivision].some((value) => value?.toLowerCase().includes(query))),
  );

  useEffect(() => {
    const dialog = detailDialog.current;
    if (!selectedDetailId || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [selectedDetailId]);

  return (
    <>
      <section aria-label="GA service" className={`relative mb-4 overflow-hidden rounded-2xl ${t.hero} px-4 py-3 text-white shadow-lg sm:px-5`}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 size-48 rounded-full border-[32px] border-white/5" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><Building2 size={18} /></span>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${t.eyebrow}`}>General Affairs</p>
              <p className={`truncate text-xs ${t.body}`} title="Requests are received and reviewed by the Admin before being forwarded to the right unit.">Requests are reviewed by the Admin · <span className="font-semibold text-white">{division ?? "No division assigned"}</span></p>
            </div>
          </div>
          {requestHref ? <Link href={requestHref} className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-sm transition ${t.cta}`}><Plus size={15} /> <span className="hidden sm:inline">Create GA Request</span><span className="sm:hidden">New</span></Link> : null}
        </div>
        {!requestHref ? <p className={`relative mt-2 flex items-start gap-2 rounded-lg border border-white/15 bg-black/10 px-3 py-2 text-[11px] leading-4 ${t.notice}`}><Info size={14} className="mt-px shrink-0" /><span>{unavailableReason ?? "Requests are currently unavailable."}</span></p> : null}
      </section>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-slate-100 p-3 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-sm font-bold text-slate-900">Request history</h2><p className="mt-1 hidden text-[11px] text-slate-500 sm:block">Track current requests and revisit previous submissions.</p></div>
            <label className="relative block w-full sm:w-72"><span className="sr-only">Search requests</span><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, title or location..." className={`h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs outline-none transition focus:bg-white focus:ring-2 ${t.focus}`} /></label>
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2" role="group" aria-label="Filter requests by status">
            {historyFilters.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1 text-center text-[11px] font-semibold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-10 sm:flex-row sm:justify-start sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-left ${t.outline} ${filter === key ? t.filterOn : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"}`}><Icon size={15} className="hidden shrink-0 sm:block" /><span className="sm:flex-1">{label}</span><span className={`rounded-md px-1.5 text-[10px] tabular-nums sm:px-2 sm:py-0.5 sm:text-[11px] ${filter === key ? `bg-white ${t.countOn}` : "bg-slate-100 text-slate-600"}`}>{counts[key]}</span></button>)}
          </div>
        </div>

        <p role="status" className="sr-only">Showing {visibleRecords.length} of {initialRecords.length} requests</p>
        {visibleRecords.length === 0 ? (
          <div className="grid place-items-center gap-2 px-5 py-12 text-center">
            <TicketCheck className="text-indigo-300" size={32} />
            <p className="text-sm font-semibold text-slate-700">{initialRecords.length === 0 ? "No requests yet" : "No matching requests"}</p>
            <p className="max-w-sm text-xs leading-5 text-slate-500">{initialRecords.length === 0 ? requestHref ? "Create your first GA request. You can follow its progress here." : "Your division’s request history will appear here." : "Try another keyword or choose a different status."}</p>
            {query || filter !== "all" ? <button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className={`mt-1 min-h-11 rounded-lg px-3 text-xs font-semibold ${t.link} focus-visible:outline-2 ${t.outline}`}>Clear filters</button> : null}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRecords.map((record) => {
              const DestinationIcon = getDivisionIcon(record.serviceDivision || "IT Team");
              return (
                <article key={record.id} className="px-3 py-2.5 transition-colors hover:bg-slate-50/70 sm:px-5 sm:py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words text-sm font-bold leading-5 text-slate-900"><button type="button" onClick={() => setSelectedDetailId(record.id)} className={`text-left focus-visible:outline-2 ${t.outline} sm:pointer-events-none`}>{record.title}</button></h3>
                    <span className="shrink-0"><StatusBadge tone={record.workflowEnabled && record.workflowStatus !== "assigned" ? record.workflowStatus === "rejected" ? "red" : "amber" : statusTone(record.status)}>{ticketStatusLabel(record)}</StatusBadge></span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 sm:text-[11px]">
                    <span className="font-mono font-bold text-slate-400">#{record.id}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-700"><DestinationIcon size={12} /> {record.receivingDivisionId ? `GA → ${record.serviceDivision}` : record.serviceDivision}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {record.location}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} className="text-slate-400" /> {record.reportedAt}</span>
                    <button type="button" onClick={() => setSelectedDetailId(record.id)} className={`ml-auto hidden min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition sm:inline-flex ${t.link} focus-visible:outline-2 ${t.outline}`} aria-label={`View details for ${record.id}`}>Details <ArrowRight size={13} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {selectedDetailRecord ? (
        <dialog ref={detailDialog} onCancel={() => setSelectedDetailId(null)} aria-labelledby="detail-modal-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-slate-400">{selectedDetailRecord.id}</span><StatusBadge tone={selectedDetailRecord.workflowEnabled && selectedDetailRecord.workflowStatus !== "assigned" ? selectedDetailRecord.workflowStatus === "rejected" ? "red" : "amber" : statusTone(selectedDetailRecord.status)}>{ticketStatusLabel(selectedDetailRecord)}</StatusBadge></div><h2 id="detail-modal-title" className="mt-1 text-base font-bold text-slate-900">{selectedDetailRecord.title}</h2></div>
              <button type="button" onClick={() => setSelectedDetailId(null)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={17} /></button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Receiving / Service Unit</p><p className="mt-1 font-bold text-blue-700">{selectedDetailRecord.receivingDivisionId ? `GA → ${selectedDetailRecord.serviceDivision}` : selectedDetailRecord.serviceDivision}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.category}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.location}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Request Date</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.reportedAt}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Priority</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.priority}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workflow</p><p className="mt-1 font-semibold text-slate-800">{requestWorkflowLabel(selectedDetailRecord.workflowStatus)}</p></div>
              </div>
              <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Request Description</h3><p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-3.5 text-xs leading-relaxed text-slate-700">{selectedDetailRecord.description}</p></div>
              {Object.keys(selectedDetailRecord.requestData).length > 0 ? <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Additional Form Information ({selectedDetailRecord.serviceDivision || "Service"})</h3><div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">{Object.entries(selectedDetailRecord.requestData).map(([key, value]) => <div key={key} className="flex flex-col px-3 py-2 text-xs sm:flex-row sm:justify-between"><span className="font-semibold text-slate-500">{formatFieldKey(key)}</span><span className="font-medium text-slate-800">{String(value)}</span></div>)}</div></div> : null}
              {selectedDetailRecord.requesterPhotoUrl ? <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Supporting Photo</h3><div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2"><Image src={selectedDetailRecord.requesterPhotoUrl} width={800} height={600} unoptimized alt="Requester attachment" className="max-h-64 w-full rounded-lg object-contain" /></div></div> : null}
            </div>
            <div className="flex justify-end border-t border-slate-100 p-4"><button type="button" onClick={() => setSelectedDetailId(null)} className="h-9 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-200">Close</button></div>
        </dialog>
      ) : null}
    </>
  );
}

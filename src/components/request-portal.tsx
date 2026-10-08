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
  Scale,
  ShoppingCart,
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
  if (normalizedName.includes("purchase") || normalizedName.includes("procurement") || normalizedName.includes("pengadaan")) return ShoppingCart;
  if (normalizedName.includes("finance") || normalizedName.includes("keuangan")) return Landmark;
  if (normalizedName.includes("legal") || normalizedName.includes("hukum")) return Scale;
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
      <section aria-label="GA service" className={`relative mb-5 overflow-hidden rounded-2xl ${t.hero} p-5 text-white shadow-lg sm:p-6`}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[40px] border-white/5" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><Building2 size={24} /></span>
            <div className="min-w-0"><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${t.eyebrow}`}>Service Destination</p><h2 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">General Affairs</h2><p className={`mt-1.5 max-w-lg text-xs leading-5 ${t.body}`}>All new requests are received and reviewed by the Admin before being forwarded to the appropriate unit.</p><p className={`mt-3 flex items-center gap-2 text-[11px] ${t.meta}`}><span className={`size-1.5 shrink-0 rounded-full ${t.dot}`} /><span className="break-words">Requester division: <strong className="font-semibold text-white">{division ?? "Not assigned"}</strong></span></p></div>
          </div>
          {requestHref ? <Link href={requestHref} className={`group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold shadow-sm transition ${t.cta} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}><Plus size={16} /> Create GA Request <ArrowRight size={15} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></Link> : <div className={`max-w-sm rounded-xl border border-white/15 bg-black/10 p-3 text-xs leading-5 ${t.notice}`}><p className="mb-1 flex items-center gap-2 font-semibold text-white"><Info size={15} /> Request unavailable</p>{unavailableReason ?? "GA is not currently accepting requests."}</div>}
        </div>
      </section>

      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-sm font-bold text-slate-900">Request history</h2><p className="mt-1 text-[11px] text-slate-500">Track current requests and revisit previous submissions.</p></div>
            <label className="relative block w-full sm:w-72"><span className="sr-only">Search requests</span><Search size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, title or location..." className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs outline-none transition focus:bg-white focus:ring-2 ${t.focus}`} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Filter requests by status">
            {historyFilters.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${t.outline} ${filter === key ? t.filterOn : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"}`}><Icon size={15} className="shrink-0" /><span className="flex-1">{label}</span><span className={`rounded-md px-2 py-0.5 tabular-nums ${filter === key ? `bg-white ${t.countOn}` : "bg-slate-100 text-slate-600"}`}>{counts[key]}</span></button>)}
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
                <article key={record.id} className="px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400">#{record.id}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"><DestinationIcon size={12} /> {record.receivingDivisionId ? `GA → ${record.serviceDivision}` : record.serviceDivision}</span>
                    <span className="ml-auto"><StatusBadge tone={record.workflowEnabled && record.workflowStatus !== "assigned" ? record.workflowStatus === "rejected" ? "red" : "amber" : statusTone(record.status)}>{ticketStatusLabel(record)}</StatusBadge></span>
                  </div>
                  <h3 className="mt-3 break-words text-sm font-bold leading-5 text-slate-900">{record.title}</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-slate-500 sm:gap-x-4 sm:text-[11px]">
                    <span className="inline-flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {record.location}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} className="text-slate-400" /> {record.reportedAt}</span>
                    <button type="button" onClick={() => setSelectedDetailId(record.id)} className={`ml-auto inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition ${t.link} focus-visible:outline-2 ${t.outline}`} aria-label={`View details for ${record.id}`}>Details <ArrowRight size={13} /></button>
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

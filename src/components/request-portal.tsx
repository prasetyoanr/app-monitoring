"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Landmark,
  MapPin,
  Plus,
  Scale,
  ShoppingCart,
  TicketCheck,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";

import { Card, PageHeader, StatusBadge } from "@/components/ui";
import type { TicketRecord } from "@/data/types";

type TargetDivision = {
  id: string;
  name: string;
};

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

function getDivisionIcon(name: string) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("purchase") || normalizedName.includes("procurement") || normalizedName.includes("pengadaan")) return ShoppingCart;
  if (normalizedName.includes("finance") || normalizedName.includes("keuangan")) return Landmark;
  if (normalizedName.includes("legal") || normalizedName.includes("hukum")) return Scale;
  if (normalizedName.includes("human") || /(^|\s)hr(\s|$)/.test(normalizedName)) return UsersRound;
  if (normalizedName.includes("teknologi") || normalizedName.includes("informatika") || /(^|\s)it(\s|$)/.test(normalizedName)) return Wrench;
  return Building2;
}

function getDivisionAccent() {
  return {
    icon: "bg-slate-100 text-slate-700 group-hover:bg-slate-700",
    label: "text-slate-700",
    edge: "border-slate-200 hover:border-slate-400 hover:bg-slate-50",
  };
}

function targetModalWidthClass(count: number) {
  if (count <= 1) return "max-w-md";
  if (count === 2) return "max-w-2xl";
  if (count === 3) return "max-w-3xl";
  if (count === 4) return "max-w-5xl";
  return "max-w-6xl";
}

function targetGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
  return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
}

export function RequestPortal({
  initialRecords,
  division,
  targetDivisions,
  useOrangeRequestButton,
}: {
  initialRecords: TicketRecord[];
  division: string | null;
  targetDivisions: TargetDivision[];
  useOrangeRequestButton: boolean;
}) {
  const router = useRouter();
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TicketRecord | null>(null);
  const targetModalWidth = targetModalWidthClass(targetDivisions.length);
  const targetGrid = targetGridClass(targetDivisions.length);

  function chooseTargetDivision(divisionId: string) {
    router.push(`/requests/new/${encodeURIComponent(divisionId)}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Internal Services"
        title="Division Requests"
        description="Submit a support or operational request to the relevant division, then track requests submitted by your division."
        action={
          <button type="button" onClick={() => setTargetModalOpen(true)} disabled={targetDivisions.length === 0} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none ${useOrangeRequestButton ? "bg-orange-500 shadow-orange-500/20 hover:bg-orange-600" : "bg-[#3157d5] shadow-blue-600/15 hover:bg-[#2445b5]"}`}>
            <Plus size={16} /> Create Request
          </button>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {/* <h2 className="text-sm font-extrabold text-slate-800">Division Request History</h2> */}
              <p className="mt-0.5 font-semibold text-sm text-[#004d32]">Requesting Division: <span className="font-semibold text-slate-700">{division ?? "Not assigned"}</span></p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{initialRecords.length} total requests</span>
          </div>
        </div>

        {initialRecords.length === 0 ? (
          <div className="grid place-items-center gap-2 px-5 py-16 text-center">
            <TicketCheck className="text-indigo-300" size={32} />
            <p className="text-sm font-semibold text-slate-700">No requests yet</p>
            <p className="max-w-sm text-xs leading-5 text-slate-500">Select “Create Request” to choose a destination division.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {initialRecords.map((record) => {
              const DestinationIcon = getDivisionIcon(record.serviceDivision || "IT Team");
              return (
                <article key={record.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400">#{record.id}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"><DestinationIcon size={12} /> {record.serviceDivision || "IT Team"}</span>
                    <span className="ml-auto"><StatusBadge tone={statusTone(record.status)} attention={record.status === "New"}>{record.status}</StatusBadge></span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold leading-5 text-slate-900">{record.title}</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-slate-500 sm:gap-x-4 sm:text-[11px]">
                    <span className="inline-flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {record.location}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} className="text-slate-400" /> {record.reportedAt}</span>
                    <button type="button" onClick={() => setSelectedDetailRecord(record)} className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 transition hover:text-blue-800 sm:text-[11px]" aria-label={`View details for ${record.id}`}>Details <ArrowRight size={13} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {targetModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="target-division-modal-title" onClick={() => setTargetModalOpen(false)}>
          <div className={`w-full ${targetModalWidth} overflow-hidden rounded-2xl bg-white shadow-2xl`} onClick={(event) => event.stopPropagation()}>
            <div className="px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                <h2 id="target-division-modal-title" className="text-base font-bold text-slate-900">Choose a Destination Division</h2>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">Select the division that will receive your request.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600"><Building2 size={12} /> From {division ?? "your division"}</span>
              </div>
            </div>
            <div className={`grid max-h-[60vh] gap-3 overflow-y-auto p-4 pt-1 ${targetGrid}`}>
              {targetDivisions.map((targetDivision) => {
                const DivisionIcon = getDivisionIcon(targetDivision.name);
                const accent = getDivisionAccent();
                return (
                  <button key={targetDivision.id} type="button" onClick={() => chooseTargetDivision(targetDivision.id)} className={`group relative flex min-h-20 items-center gap-3 overflow-hidden rounded-2xl border bg-white p-4 text-left text-sm font-bold text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none ${accent.edge}`}>
                    <span className={`grid size-10 place-items-center rounded-xl transition duration-200 group-hover:scale-105 group-hover:-rotate-3 group-hover:text-white group-active:scale-95 motion-reduce:transform-none motion-reduce:transition-none ${accent.icon}`}>
                      <DivisionIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{targetDivision.name}</span>
                    <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-bold opacity-70 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transform-none motion-reduce:transition-none ${accent.label}`}><ArrowUpRight size={13} /></span>
                  </button>
                );
              })}
              {targetDivisions.length === 0 ? <p className="col-span-full px-3 py-8 text-center text-xs text-slate-500">No destination divisions are currently active.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedDetailRecord ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-slate-400">{selectedDetailRecord.id}</span><StatusBadge tone={statusTone(selectedDetailRecord.status)}>{selectedDetailRecord.status}</StatusBadge></div><h2 id="detail-modal-title" className="mt-1 text-base font-bold text-slate-900">{selectedDetailRecord.title}</h2></div>
              <button type="button" onClick={() => setSelectedDetailRecord(null)} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={17} /></button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Service Destination</p><p className="mt-1 font-bold text-blue-700">{selectedDetailRecord.serviceDivision || "IT Team"}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.category}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.location}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Request Date</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.reportedAt}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Priority</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.priority}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Completion Time</p><p className="mt-1 font-semibold text-slate-800">{selectedDetailRecord.completedDays === null ? "Not completed" : selectedDetailRecord.completedDays === 0 ? "Same day" : `${selectedDetailRecord.completedDays} days`}</p></div>
              </div>
              <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Request Description</h3><p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-3.5 text-xs leading-relaxed text-slate-700">{selectedDetailRecord.description}</p></div>
              {Object.keys(selectedDetailRecord.requestData).length > 0 ? <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Additional Form Information ({selectedDetailRecord.serviceDivision || "Service"})</h3><div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">{Object.entries(selectedDetailRecord.requestData).map(([key, value]) => <div key={key} className="flex flex-col px-3 py-2 text-xs sm:flex-row sm:justify-between"><span className="font-semibold text-slate-500">{formatFieldKey(key)}</span><span className="font-medium text-slate-800">{String(value)}</span></div>)}</div></div> : null}
              {selectedDetailRecord.requesterPhotoUrl ? <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Supporting Photo</h3><div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2"><Image src={selectedDetailRecord.requesterPhotoUrl} width={800} height={600} unoptimized alt="Requester attachment" className="max-h-64 w-full rounded-lg object-contain" /></div></div> : null}
            </div>
            <div className="flex justify-end border-t border-slate-100 p-4"><button type="button" onClick={() => setSelectedDetailRecord(null)} className="h-9 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-200">Close</button></div>
          </div>
        </div>
      ) : null}
    </>
  );
}

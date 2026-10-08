"use client";

import { AlertTriangle, ArrowRight, Route, UserRoundPlus, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { adminReassignIssueAction } from "@/app/admin-operations/actions";
import { Card, StatusBadge } from "@/components/ui";
import type { AdminOperationRecord } from "@/data/admin-operations";
import { issueStatusLabel } from "@/lib/issue-status";

type OperationView = "all" | "stalled" | "unassigned" | "invalid";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function AdminOperationsCenter({
  initialRecords,
  initialView,
}: {
  initialRecords: AdminOperationRecord[];
  initialView: OperationView;
}) {
  const router = useRouter();
  const [view, setView] = useState<OperationView>(initialView);
  const [target, setTarget] = useState<AdminOperationRecord | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const counts = {
    all: initialRecords.length,
    stalled: initialRecords.filter((record) => record.stalled).length,
    unassigned: initialRecords.filter((record) => record.unassigned).length,
    invalid: initialRecords.filter((record) => record.invalidAssignment).length,
  };
  const records = useMemo(() => initialRecords.filter((record) => {
    if (view === "stalled") return record.stalled;
    if (view === "unassigned") return record.unassigned;
    if (view === "invalid") return record.invalidAssignment;
    return true;
  }), [initialRecords, view]);

  function openReassign(record: AdminOperationRecord) {
    setTarget(record);
    setAssigneeId("");
    setReason("");
    setError("");
  }

  function submitReassignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await adminReassignIssueAction({ issueId: target.id, assigneeId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTarget(null);
      setSuccess(`${target.id} was reassigned successfully.`);
      router.refresh();
    });
  }

  return (
    <>
      <div role="tablist" aria-label="Exception type" className="flex flex-wrap gap-1.5">
        {([
          ["all", "All", counts.all, "border-slate-300 bg-slate-900 text-white", "border-slate-200 bg-white text-slate-600 hover:bg-slate-50", "bg-white/20 text-white", "bg-slate-100 text-slate-600"],
          ["stalled", "Stalled", counts.stalled, "border-amber-500 bg-amber-500 text-white", "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100", "bg-white/25 text-white", "bg-amber-200/70 text-amber-900"],
          ["unassigned", "Unassigned", counts.unassigned, "border-amber-500 bg-amber-500 text-white", "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100", "bg-white/25 text-white", "bg-amber-200/70 text-amber-900"],
          ["invalid", "Invalid assignment", counts.invalid, "border-rose-600 bg-rose-600 text-white", "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100", "bg-white/25 text-white", "bg-rose-200/70 text-rose-800"],
        ] as const).map(([value, label, count, activeStyle, idleStyle, activeCount, idleCount]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${view === value ? activeStyle : count === 0 ? "border-slate-200 bg-white text-slate-400 hover:bg-slate-50" : idleStyle}`}
          >
            {label}
            <span className={`min-w-5 rounded-full px-1.5 text-center text-[10px] tabular-nums ${view === value ? activeCount : count === 0 ? "bg-slate-100 text-slate-400" : idleCount}`}>{count}</span>
          </button>
        ))}
      </div>

      {success ? <p role="status" className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">{success}</p> : null}

      <Card className="mt-3 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5"><div className="min-w-0"><h2 className="text-sm font-bold text-slate-900">Recovery Queue</h2><p className="truncate text-[10px] text-slate-500">Only exceptions are shown. Normal work remains in Inbox.</p></div><span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{records.length} records</span></div>
        {records.length ? <div className="divide-y divide-slate-100">{records.map((record) => {
          // Stalled for a week or more, or an invalid assignment, is more serious than a
          // plain 3-day stall or a request that is simply waiting to be assigned.
          const severe = record.invalidAssignment || (record.stalled && record.inactiveDays >= 7);
          return (
            <article key={record.id} className={`border-l-4 px-3 py-2.5 transition hover:bg-slate-50/70 sm:px-4 ${severe ? "border-rose-500" : "border-amber-400"}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-72">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[9px] font-bold text-slate-400">{record.id}</span>
                    {record.stalled ? <StatusBadge tone={record.inactiveDays >= 7 ? "red" : "amber"}>Stalled · {record.inactiveDays}d</StatusBadge> : null}
                    {record.unassigned ? <StatusBadge tone="amber">Awaiting assignment</StatusBadge> : null}
                    {record.invalidAssignment ? <StatusBadge tone="red">Invalid assignment</StatusBadge> : null}
                  </div>
                  <h3 className="mt-1 truncate text-xs font-bold text-slate-900">{record.title}</h3>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {record.division} → {record.serviceDivision} · {issueStatusLabel(record.status)} · Staff: <strong className="font-semibold text-slate-700">{record.currentAssignee ?? "Not available"}</strong> · {dateTime.format(new Date(record.lastUpdatedAt)).replace(",", "")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {record.canReassign ? <button type="button" onClick={() => openReassign(record)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[10px] font-semibold text-white transition hover:bg-indigo-700 active:scale-95"><UserRoundPlus size={13} /> Reassign</button> : null}
                  <Link href={record.unassigned ? "/inbox?workflow=ready_for_assignment" : "/inbox?attention=stalled"} title="Open Inbox" aria-label={`Open Inbox for ${record.id}`} className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95"><ArrowRight size={14} /></Link>
                </div>
              </div>
            </article>
          );
        })}</div> : <div className="px-5 py-10 text-center"><Wrench className="mx-auto text-slate-300" size={26} /><p className="mt-2.5 text-sm font-bold text-slate-700">No recovery items</p><p className="mt-1 text-xs text-slate-400">There are no records in this exception category.</p></div>}
      </Card>

      {target ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reassign-title">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 id="reassign-title" className="text-sm font-bold text-slate-900">Recover assignment</h2><p className="mt-1 text-[10px] text-slate-500">{target.id} · {target.title}</p></div><button type="button" disabled={pending} onClick={() => setTarget(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={17} /></button></div>
            <form onSubmit={submitReassignment} className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800"><div className="flex gap-2"><AlertTriangle className="mt-0.5 shrink-0" size={14} /><p>Approval and work status will remain unchanged. The old and new assignment will be recorded in workflow history and Log.</p></div></div>
              <label className="block text-[11px] font-semibold text-slate-600">New service agent<select required value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"><option value="">Select service agent</option>{target.eligibleAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.division}</option>)}</select></label>
              <label className="block text-[11px] font-semibold text-slate-600">Recovery reason<textarea required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none" placeholder="Explain why this assignment must be moved." /></label>
              {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
              <div className="flex justify-end gap-2"><button type="button" disabled={pending} onClick={() => setTarget(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={pending || !assigneeId || reason.trim().length < 5} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white disabled:bg-slate-300"><Route size={14} /> {pending ? "Reassigning..." : "Confirm Reassignment"}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

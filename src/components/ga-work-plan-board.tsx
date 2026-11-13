"use client";

import { CalendarDays, CheckCircle2, ChevronDown, CircleDot, ClipboardList, Clock3, Eye, FileText, LayoutGrid, List, LoaderCircle, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { createGaWorkPlanAction, deleteGaWorkPlanAction, updateGaWorkPlanAction, updateGaWorkPlanStatusAction } from "@/app/activities/actions";
import type { GaWorkPlanRecord } from "@/data/ga-workspace";
import { gaWorkPlanStatusLabel, gaWorkPlanStatuses, type GaWorkPlanStatus, type GaWorkPlanTargetMode } from "@/lib/ga-work-plan";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusTone: Record<GaWorkPlanStatus, string> = {
  planned: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15",
  in_progress: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  cancelled: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-600/20",
};

const statusStrip: Record<GaWorkPlanStatus, string> = {
  planned: "bg-slate-300",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-400",
};

function WorkPlanNote({ id, description }: { id: string; description: string }) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = description.length > 60 || description.split(/\r?\n/).length > 2;
  return (
    <div className="mt-0.5 min-w-0">
      <p id={`ga-plan-note-${id}`} className={`whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-500 ${canCollapse && !expanded ? "line-clamp-2" : ""}`}>
        {description}
      </p>
      {canCollapse ? <button type="button" aria-expanded={expanded} aria-controls={`ga-plan-note-${id}`} onClick={() => setExpanded((current) => !current)} style={{ fontSize: 10, fontWeight: 500 }} className="mt-0.5 inline-flex items-center gap-0.5 rounded text-indigo-700 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
        {expanded ? "Show less" : "Show full note"}
        <ChevronDown size={10} className={expanded ? "rotate-180" : ""} />
      </button> : null}
    </div>
  );
}

function WorkPlanDetailsDialog({ plan, memberName, onClose }: { plan: GaWorkPlanRecord; memberName: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ga-plan-detail-title" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 bg-[#004d32] px-4 py-3.5 text-white sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">Work plan detail <span aria-hidden="true">·</span><UserRound size={11} className="shrink-0" /><span className="truncate normal-case tracking-normal">{memberName}</span></p>
            <h2 id="ga-plan-detail-title" className="mt-1.5 break-words text-base font-bold leading-6 text-white">{plan.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close work plan detail" className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><X size={16} /></button>
        </header>
        <section aria-label="Work plan information" className="overflow-y-auto">
          <div className="bg-[#004d32] px-4 pb-4 pt-1 sm:px-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-white px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"><CircleDot size={12} className="text-[#006746]" />Status</div>
                <span className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${statusTone[plan.status]}`}>{gaWorkPlanStatusLabel(plan.status)}</span>
              </div>
              <div className="rounded-xl bg-white px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"><CalendarDays size={12} className="text-[#006746]" />Target</div>
                <p className="mt-1.5 text-xs font-semibold leading-4 text-slate-900">{plan.targetMode === "until_completed" || !plan.targetDate ? "Until completed" : dateFormat.format(new Date(`${plan.targetDate}T00:00:00Z`))}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-white px-3 py-2.5 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"><Clock3 size={12} className="text-[#006746]" />Created</div>
                <p className="mt-1.5 text-xs font-semibold leading-4 text-slate-900">{dateTimeFormat.format(new Date(plan.createdAt))}</p>
              </div>
            </div>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><FileText size={14} className="text-[#006746]" />Plan notes</div>
            <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-[#f7faf8] p-3 text-[13px] leading-5 text-slate-700">{plan.description || "No notes"}</p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 size={12} className="shrink-0" />Last updated {dateTimeFormat.format(new Date(plan.updatedAt))}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function GaWorkPlanBoard({
  memberName,
  defaultTargetDate,
  plans,
  canEdit,
  amberCta = false,
}: {
  memberName: string;
  defaultTargetDate: string;
  plans: GaWorkPlanRecord[];
  canEdit: boolean;
  amberCta?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const lastViewButtonRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");
  const [targetMode, setTargetMode] = useState<GaWorkPlanTargetMode>("date");
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GaWorkPlanStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [viewingId, setViewingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingTargetMode, setEditingTargetMode] = useState<GaWorkPlanTargetMode>("date");
  const searchText = search.trim().toLocaleLowerCase("id-ID");
  const visiblePlans = plans.filter((plan) => (statusFilter === "all" || plan.status === statusFilter) && `${plan.title} ${plan.description} ${gaWorkPlanStatusLabel(plan.status)}`.toLocaleLowerCase("id-ID").includes(searchText));
  const viewingPlan = plans.find((plan) => plan.id === viewingId) ?? null;
  const planGrid = "grid grid-cols-2 gap-x-3 gap-y-3 lg:items-center lg:gap-x-4 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto]";

  function closeView() {
    setViewingId("");
    requestAnimationFrame(() => lastViewButtonRef.current?.focus());
  }

  function submitPlan(form: HTMLFormElement) {
    const data = new FormData(form);
    startTransition(async () => {
      setMessage("");
      try {
        const result = await createGaWorkPlanAction(data);
        setMessage(result.ok ? "Work plan item saved." : result.error);
        if (result.ok) {
          formRef.current?.reset();
          setTargetMode("date");
          setFormOpen(false);
          router.refresh();
        }
      } catch {
        setMessage("Unable to contact the server. Please try again.");
      }
    });
  }

  function updateStatus(id: string, status: GaWorkPlanStatus) {
    setUpdatingId(id);
    startTransition(async () => {
      setMessage("");
      try {
        const result = await updateGaWorkPlanStatusAction({ id, status });
        setMessage(result.ok ? "Work plan status updated." : result.error);
        router.refresh();
      } catch {
        setMessage("Unable to contact the server. Please try again.");
      } finally {
        setUpdatingId("");
      }
    });
  }

  function submitEdit(form: HTMLFormElement) {
    const values = new FormData(form);
    startTransition(async () => {
      setMessage("");
      try {
        const result = await updateGaWorkPlanAction({
          id: editingId,
          title: String(values.get("title") ?? ""),
          description: String(values.get("description") ?? ""),
          targetMode: editingTargetMode,
          targetDate: editingTargetMode === "date" ? String(values.get("targetDate") ?? "") : "",
        });
        setMessage(result.ok ? "Work plan updated." : result.error);
        if (result.ok) { setEditingId(""); router.refresh(); }
      } catch {
        setMessage("Unable to contact the server. Please try again.");
      }
    });
  }

  function deletePlan(id: string) {
    if (!window.confirm("Delete this work plan? This cannot be undone.")) return;
    startTransition(async () => {
      setMessage("");
      try {
        const result = await deleteGaWorkPlanAction(id);
        setMessage(result.ok ? "Work plan deleted." : result.error);
        if (result.ok) { setEditingId(""); router.refresh(); }
      } catch {
        setMessage("Unable to contact the server. Please try again.");
      }
    });
  }

  return (
    <div className="grid gap-4 font-[inherit]">
      {canEdit ? <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <button type="button" aria-expanded={formOpen} aria-controls="ga-work-plan-form" onClick={() => setFormOpen((open) => !open)} className="ga-work-plan-toggle group flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5">
          <span className="flex min-w-0 items-center gap-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${amberCta ? "bg-amber-400 text-slate-900" : "bg-indigo-600 text-white"}`}><Plus size={16} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">Add Work Plan</span><span className="mt-0.5 block truncate text-xs text-slate-500">Set a past or future target date, or keep the plan open</span></span>
          </span>
          <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center transition-colors ${amberCta ? "text-amber-800" : "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100"}`}><span className={`grid transition-transform duration-200 motion-reduce:transition-none ${formOpen ? "rotate-180" : ""}`}><ChevronDown size={32} strokeWidth={2.25} /></span></span>
        </button>

        {formOpen ? <div id="ga-work-plan-form" className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <form ref={formRef} className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); submitPlan(event.currentTarget); }}>
            <label className="text-xs font-medium text-slate-600">Plan title<input name="title" required minLength={3} maxLength={200} disabled={pending} placeholder="Example: Inspect meeting rooms" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">Target type<select name="targetMode" value={targetMode} disabled={pending} onChange={(event) => setTargetMode(event.target.value as GaWorkPlanTargetMode)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"><option value="date">Specific date</option><option value="until_completed">Until completed</option></select></label>
              {targetMode === "date" ? <label className="text-xs font-medium text-slate-600">Target date<input name="targetDate" type="date" required defaultValue={defaultTargetDate} disabled={pending} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label> : <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 px-3 py-2"><p className="text-xs font-semibold text-indigo-600">Open target</p><p className="mt-1 text-xs leading-4 text-slate-600">Runs until marked Completed.</p></div>}
            </div>
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">Plan notes<textarea name="description" maxLength={2000} rows={2} disabled={pending} placeholder="Optional scope, location, or expected result" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
            <button type="submit" disabled={pending} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:col-start-2 ${amberCta ? "bg-amber-400 text-slate-900 hover:bg-amber-300" : "bg-slate-900 text-white hover:bg-slate-700"}`}>{pending && !updatingId ? <LoaderCircle size={14} className="animate-spin" /> : <CalendarDays size={14} />} Save Work Plan</button>
          </form>
        </div> : null}
      </section> : null}

      {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 shadow-sm">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><ClipboardList size={17} /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900">Activity Plan</h2><p className="mt-0.5 truncate text-xs text-slate-500">{memberName} · {plans.length} items</p><p className="mt-0.5 text-[10px] text-slate-400">Newest created first</p></div></div>
          <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white tabular-nums">{visiblePlans.length} shown</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <label className="relative min-w-[180px] flex-1"><span className="sr-only">Search work plans</span><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plan or notes" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-indigo-400" /></label>
          <label className="sr-only" htmlFor="ga-plan-status-filter">Filter work plan status</label>
          <select id="ga-plan-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as GaWorkPlanStatus | "all")} className="h-9 min-w-32 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400">
            <option value="all">All statuses</option>
            {gaWorkPlanStatuses.map((status) => <option key={status} value={status}>{gaWorkPlanStatusLabel(status)}</option>)}
          </select>
          <div className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Work plan view">
            <button type="button" aria-label="List view" aria-pressed={viewMode === "list"} title="List view" onClick={() => setViewMode("list")} className={`grid size-8 place-items-center rounded-md transition ${viewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><List size={16} /></button>
            <button type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} title="Grid view" onClick={() => setViewMode("grid")} className={`grid size-8 place-items-center rounded-md transition ${viewMode === "grid" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}><LayoutGrid size={16} /></button>
          </div>
        </div>

        {visiblePlans.length ? (
          <div>
            {viewMode === "list" ? <div className={`${planGrid} border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 max-lg:hidden`}>
              <span>Work plan</span><span>Target</span><span>Created</span><span>Status</span><span className="text-right">Actions</span>
            </div> : null}
            <div className={viewMode === "grid" ? "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 sm:p-4" : "divide-y divide-slate-100"}>
              {visiblePlans.map((plan, index) => (
                <article key={plan.id} className={viewMode === "grid" ? "relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md" : "relative bg-white transition-colors hover:bg-slate-50/70 even:bg-slate-50/40"}>
                  <span aria-hidden="true" className={`absolute ${viewMode === "grid" ? "inset-x-0 top-0 h-1" : "inset-y-0 left-0 w-1"} ${statusStrip[plan.status]}`} />
                  <div className={viewMode === "grid" ? "grid grid-cols-2 gap-x-3 gap-y-3 p-4 pt-5" : `${planGrid} px-4 py-3.5 pl-5 sm:px-5 sm:pl-6`}>
                    <div className={viewMode === "grid" ? "col-span-2 min-w-0" : "col-span-2 min-w-0 lg:col-span-1"}>
                      <div className="flex items-start gap-2">
                        <span className="grid min-w-5 shrink-0 place-items-center rounded bg-indigo-50 px-1 text-[10px] font-bold leading-5 tabular-nums text-indigo-700">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-xs font-bold leading-5 text-slate-900">{plan.title}</h3>
                          {plan.description ? <WorkPlanNote id={plan.id} description={plan.description} /> : <p className="mt-0.5 text-[11px] text-slate-400">No notes</p>}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 text-[11px] font-medium text-slate-700">
                      <span className={`mb-0.5 block text-[9px] font-bold uppercase text-slate-400 ${viewMode === "list" ? "lg:hidden" : ""}`}>Target</span>
                      {plan.targetMode === "until_completed" || !plan.targetDate ? "Until completed" : dateFormat.format(new Date(`${plan.targetDate}T00:00:00Z`))}
                    </div>
                    <div className="min-w-0 text-[11px] text-slate-600">
                      <span className={`mb-0.5 block text-[9px] font-bold uppercase text-slate-400 ${viewMode === "list" ? "lg:hidden" : ""}`}>Created</span>
                      {dateFormat.format(new Date(plan.createdAt))}
                    </div>
                    <div className="min-w-0">
                      <span className={`mb-0.5 block text-[9px] font-bold uppercase text-slate-400 ${viewMode === "list" ? "lg:hidden" : ""}`}>Status</span>
                      {canEdit ? (
                        <select key={`${plan.id}-${plan.status}`} aria-label={`Status for ${plan.title}`} defaultValue={plan.status} disabled={pending} onChange={(event) => updateStatus(plan.id, event.target.value as GaWorkPlanStatus)} className="h-9 w-full max-w-36 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-60">
                          {gaWorkPlanStatuses.map((status) => <option key={status} value={status}>{gaWorkPlanStatusLabel(status)}</option>)}
                        </select>
                      ) : <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${statusTone[plan.status]}`}>{gaWorkPlanStatusLabel(plan.status)}</span>}
                    </div>
                    <div className="flex items-end justify-end gap-1 lg:items-center">
                        <button type="button" onClick={(event) => { lastViewButtonRef.current = event.currentTarget; setViewingId(plan.id); }} aria-label={`View ${plan.title}`} title="View work plan" className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"><Eye size={16} /></button>
                      {canEdit ? <>
                        <button type="button" disabled={pending} onClick={() => { setEditingId(editingId === plan.id ? "" : plan.id); setEditingTargetMode(plan.targetMode); }} aria-label={`Edit ${plan.title}`} className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"><Pencil size={15} /></button>
                        <button type="button" disabled={pending} onClick={() => deletePlan(plan.id)} aria-label={`Delete ${plan.title}`} className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 size={15} /></button>
                      </> : null}
                    </div>
                  </div>
                  {canEdit && editingId === plan.id ? (
                    <form className="grid gap-3 border-t border-slate-100 bg-indigo-50/40 p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); submitEdit(event.currentTarget); }}>
                      <label className="text-xs font-medium text-slate-600">Plan title<input name="title" required minLength={3} maxLength={200} defaultValue={plan.title} disabled={pending} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                      <label className="text-xs font-medium text-slate-600">Target type<select value={editingTargetMode} onChange={(event) => setEditingTargetMode(event.target.value as GaWorkPlanTargetMode)} disabled={pending} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="date">Specific date</option><option value="until_completed">Until completed</option></select></label>
                      {editingTargetMode === "date" ? <label className="text-xs font-medium text-slate-600">Target date<input name="targetDate" type="date" required defaultValue={plan.targetDate ?? defaultTargetDate} disabled={pending} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label> : null}
                      <label className="text-xs font-medium text-slate-600 sm:col-span-2">Plan notes<textarea name="description" maxLength={2000} rows={2} defaultValue={plan.description} disabled={pending} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /></label>
                      <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Save changes</button><button type="button" disabled={pending} onClick={() => setEditingId("")} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button></div>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : <div className="px-5 py-12 text-center"><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-400"><CheckCircle2 size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-700">{search || statusFilter !== "all" ? "No matching plans" : "No activity plan yet"}</p><p className="mt-1 text-xs text-slate-400">{search || statusFilter !== "all" ? "Try another search or status filter." : canEdit ? "Use Add Work Plan above to create the first plan." : "This staff account has not added a plan for this selection."}</p></div>}
      </section>
      {viewingPlan ? <WorkPlanDetailsDialog plan={viewingPlan} memberName={memberName} onClose={closeView} /> : null}
    </div>
  );
}

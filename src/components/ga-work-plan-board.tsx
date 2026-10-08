"use client";

import { CalendarDays, CheckCircle2, ChevronDown, ClipboardList, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { createGaWorkPlanAction, updateGaWorkPlanStatusAction } from "@/app/activities/actions";
import type { GaWorkPlanRecord } from "@/data/ga-workspace";
import { gaWorkPlanStatusLabel, gaWorkPlanStatuses, type GaWorkPlanStatus, type GaWorkPlanTargetMode } from "@/lib/ga-work-plan";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "2-digit",
  month: "short",
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

export function GaWorkPlanBoard({
  memberName,
  periodStart,
  periodEnd,
  selectedDate,
  plans,
  canEdit,
  amberCta = false,
}: {
  memberName: string;
  periodStart: string;
  periodEnd: string;
  selectedDate?: string;
  plans: GaWorkPlanRecord[];
  canEdit: boolean;
  amberCta?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");
  const [targetMode, setTargetMode] = useState<GaWorkPlanTargetMode>("date");
  const [formOpen, setFormOpen] = useState(false);

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

  return (
    <div className="grid gap-4 font-[inherit]">
      {canEdit ? <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <button type="button" aria-expanded={formOpen} aria-controls="ga-work-plan-form" onClick={() => setFormOpen((open) => !open)} className="ga-work-plan-toggle group flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5">
          <span className="flex min-w-0 items-center gap-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${amberCta ? "bg-amber-400 text-slate-900" : "bg-indigo-600 text-white"}`}><Plus size={16} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">Add Work Plan</span><span className="mt-0.5 block truncate text-xs text-slate-500">Create a new task for this reporting selection</span></span>
          </span>
          <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center transition-colors ${amberCta ? "text-amber-800" : "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100"}`}><span className={`grid transition-transform duration-200 motion-reduce:transition-none ${formOpen ? "rotate-180" : ""}`}><ChevronDown size={32} strokeWidth={2.25} /></span></span>
        </button>

        {formOpen ? <div id="ga-work-plan-form" className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <form ref={formRef} className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); submitPlan(event.currentTarget); }}>
            <input type="hidden" name="weekStart" value={periodStart} />
            <label className="text-xs font-medium text-slate-600">Plan title<input name="title" required minLength={3} maxLength={200} disabled={pending} placeholder="Example: Inspect meeting rooms" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">Target type<select name="targetMode" value={targetMode} disabled={pending} onChange={(event) => setTargetMode(event.target.value as GaWorkPlanTargetMode)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"><option value="date">Specific date</option><option value="until_completed">Until completed</option></select></label>
              {targetMode === "date" ? <label className="text-xs font-medium text-slate-600">Target date<input name="targetDate" type="date" required min={selectedDate ?? periodStart} max={selectedDate ?? periodEnd} defaultValue={selectedDate ?? periodStart} disabled={pending} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label> : <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/70 px-3 py-2"><p className="text-xs font-semibold text-indigo-600">Open target</p><p className="mt-1 text-xs leading-4 text-slate-600">Runs until marked Completed.</p></div>}
            </div>
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">Plan notes<textarea name="description" maxLength={2000} rows={2} disabled={pending} placeholder="Optional scope, location, or expected result" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
            <button type="submit" disabled={pending} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:col-start-2 ${amberCta ? "bg-amber-400 text-slate-900 hover:bg-amber-300" : "bg-slate-900 text-white hover:bg-slate-700"}`}>{pending && !updatingId ? <LoaderCircle size={14} className="animate-spin" /> : <CalendarDays size={14} />} Save Work Plan</button>
          </form>
        </div> : null}
      </section> : null}

      {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 shadow-sm">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><ClipboardList size={17} /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900">Activity Plan</h2><p className="mt-0.5 truncate text-xs text-slate-500">{memberName} · {plans.length} items</p></div></div>
          <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white tabular-nums">{selectedDate ? "By date" : "Fri–Thu"}</span>
        </div>

        {plans.length ? <div className="grid gap-2.5 p-3 sm:p-4">{plans.map((plan) => <article key={plan.id} className="overflow-hidden rounded-xl border border-slate-200/90 bg-white transition hover:shadow-md">
          <span aria-hidden="true" className={`block h-1 ${statusStrip[plan.status]}`} />
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">{plan.title}</h3><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${statusTone[plan.status]}`}>{gaWorkPlanStatusLabel(plan.status)}</span></div>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><CalendarDays size={12} className="text-slate-400" />{plan.targetMode === "until_completed" || !plan.targetDate ? "Target until completed" : `Target ${dateFormat.format(new Date(`${plan.targetDate}T00:00:00Z`))}`}</p>
              {plan.description ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{plan.description}</p> : null}
            </div>
            {canEdit ? <label className="shrink-0 text-xs font-medium text-slate-500">Status<select key={`${plan.id}-${plan.status}`} defaultValue={plan.status} disabled={pending && updatingId === plan.id} onChange={(event) => updateStatus(plan.id, event.target.value as GaWorkPlanStatus)} className="mt-1 block h-9 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-indigo-400">{gaWorkPlanStatuses.map((status) => <option key={status} value={status}>{gaWorkPlanStatusLabel(status)}</option>)}</select></label> : null}
          </div>
        </article>)}</div> : <div className="px-5 py-12 text-center"><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-400"><CheckCircle2 size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-700">No activity plan yet</p><p className="mt-1 text-xs text-slate-400">{canEdit ? "Use Add Work Plan above to create the first plan." : "This staff account has not added a plan for this selection."}</p></div>}
      </section>
    </div>
  );
}

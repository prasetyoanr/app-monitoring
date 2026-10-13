"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, LoaderCircle, MapPin, Plus, Search, UsersRound, X } from "lucide-react";

import { createInternalGaRequestAction, updateInternalGaStatusAction } from "@/app/requests/internal-actions";
import { Card, StatusBadge } from "@/components/ui";
import type { InternalGaMember, InternalGaRequestRecord } from "@/data/internal-ga";
import { internalGaEventText, internalGaStatusLabel, internalGaTransitionError, type InternalGaStatus } from "@/lib/internal-ga";

const themes = {
  ga: {
    hero: "bg-gradient-to-br from-[#123e35] via-[#165446] to-[#216f5d] shadow-emerald-950/10",
    eyebrow: "text-emerald-200",
    body: "text-emerald-50/85",
    cta: "bg-amber-400 text-emerald-950 hover:bg-amber-300",
    focus: "focus:border-emerald-500 focus:ring-emerald-100",
    filterOn: "border-emerald-200 bg-emerald-50 text-emerald-800",
    primary: "bg-emerald-700 hover:bg-emerald-800",
  },
  it: {
    hero: "bg-indigo-950 shadow-indigo-950/20",
    eyebrow: "text-amber-300",
    body: "text-indigo-100/85",
    cta: "bg-amber-400 text-indigo-950 hover:bg-amber-300",
    focus: "focus:border-indigo-500 focus:ring-indigo-100",
    filterOn: "border-indigo-200 bg-indigo-50 text-indigo-900",
    primary: "bg-indigo-700 hover:bg-indigo-800",
  },
} as const;

export type InternalGaMode = "history" | "inbox";

type FilterKey = "all" | "active" | "finished" | "mine" | "team";

// History is what the person sent; the inbox is what others sent to them or to the team.
const modes: Record<
  InternalGaMode,
  {
    label: string;
    description: string;
    filters: ReadonlyArray<{ key: FilterKey; label: string }>;
    defaultFilter: FilterKey;
    actions: ReadonlySet<InternalGaStatus>;
    emptyTitle: string;
    emptyText: string;
  }
> = {
  history: {
    label: "Internal GA · Requests",
    description: "Requests you sent to the GA team and where they stand.",
    filters: [
      { key: "all", label: "All" },
      { key: "active", label: "Active" },
      { key: "finished", label: "Finished" },
    ],
    defaultFilter: "all",
    actions: new Set<InternalGaStatus>(["cancelled", "open"]),
    emptyTitle: "No internal requests yet",
    emptyText: "Create one to ask a teammate or the whole team for help.",
  },
  inbox: {
    label: "Internal GA · Inbox",
    description: "Requests other GA team members sent to you or to the whole team.",
    filters: [
      { key: "active", label: "Active" },
      { key: "mine", label: "Addressed to me" },
      { key: "team", label: "Whole team" },
      { key: "finished", label: "Finished" },
    ],
    defaultFilter: "active",
    actions: new Set<InternalGaStatus>(["in_progress", "done", "open"]),
    emptyTitle: "Nothing waiting for you",
    emptyText: "Requests sent to you or to the whole team will appear here.",
  },
};

function statusTone(status: InternalGaStatus): "green" | "blue" | "amber" | "red" | "gray" {
  if (status === "done") return "green";
  if (status === "in_progress") return "blue";
  if (status === "cancelled") return "gray";
  return "amber";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function InternalGaRoom({
  mode,
  requests,
  members,
  currentUserId,
  division,
  theme,
}: {
  mode: InternalGaMode;
  requests: InternalGaRequestRecord[];
  members: InternalGaMember[];
  currentUserId: string;
  division: string | null;
  theme: keyof typeof themes;
}) {
  const t = themes[theme];
  const config = modes[mode];
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>(config.defaultFilter);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const scoped = requests.filter((request) => (mode === "history" ? request.createdById === currentUserId : request.createdById !== currentUserId));
  const isFinished = (request: InternalGaRequestRecord) => request.status === "done" || request.status === "cancelled";
  const matches: Record<FilterKey, (request: InternalGaRequestRecord) => boolean> = {
    all: () => true,
    active: (request) => !isFinished(request),
    mine: (request) => !isFinished(request) && request.assignedToId === currentUserId,
    team: (request) => !isFinished(request) && request.assignedToId === null,
    finished: isFinished,
  };
  const query = search.trim().toLowerCase();
  const visible = scoped.filter(
    (request) =>
      matches[filter](request) &&
      (!query || [request.title, request.description, request.location, request.createdByName, request.assignedToName].some((value) => value?.toLowerCase().includes(query))),
  );

  async function createRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending("create");
    setError("");
    const result = await createInternalGaRequestAction(new FormData(form));
    setPending("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    form.reset();
    setCreating(false);
    router.refresh();
  }

  async function changeStatus(request: InternalGaRequestRecord, status: InternalGaStatus) {
    setPending(`${request.id}:${status}`);
    setError("");
    const result = await updateInternalGaStatusAction(request.id, status, notes[request.id] ?? "");
    setPending("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function actionsFor(request: InternalGaRequestRecord) {
    const options: Array<{ status: InternalGaStatus; label: string }> = [
      { status: "in_progress", label: request.assignedToId === null ? "Take it" : "Start" },
      { status: "done", label: "Mark done" },
      { status: "open", label: "Reopen" },
      { status: "cancelled", label: "Cancel" },
    ];
    return options.filter((option) => config.actions.has(option.status) && !internalGaTransitionError(currentUserId, request, option.status));
  }

  return (
    <>
      {mode === "history" ? (
      <section aria-label={config.label} className={`relative mb-4 overflow-hidden rounded-2xl ${t.hero} px-4 py-3 text-white shadow-lg sm:px-5`}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 size-48 rounded-full border-[32px] border-white/5" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15"><UsersRound size={18} /></span>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${t.eyebrow}`}>{config.label}</p>
              <p className={`truncate text-xs ${t.body}`} title={config.description}>{config.description}{division ? ` · ${division}` : ""}</p>
            </div>
          </div>
          <button type="button" onClick={() => { setCreating(true); setError(""); }} className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-sm transition ${t.cta}`}><Plus size={15} /> <span className="hidden sm:inline">New internal request</span><span className="sm:hidden">New</span></button>
        </div>
      </section>
      ) : null}

      {error && !creating ? <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p> : null}

      <Card className="overflow-hidden">
        <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-sm font-bold text-slate-900">{mode === "history" ? "Request history" : "Internal inbox"}</h2><p className="mt-1 text-[11px] text-slate-500">{config.description}</p></div>
            <label className="relative block w-full sm:w-72"><span className="sr-only">Search internal requests</span><Search size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, person or location..." className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs outline-none transition focus:bg-white focus:ring-2 ${t.focus}`} /></label>
          </div>
          <div className={`grid grid-cols-2 gap-2 ${config.filters.length > 3 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`} role="group" aria-label="Filter internal requests">
            {config.filters.map(({ key, label }) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition ${filter === key ? t.filterOn : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"}`}>
                <span className="flex-1">{label}</span>
                <span className={`rounded-md px-2 py-0.5 tabular-nums ${filter === key ? "bg-white" : "bg-slate-100 text-slate-600"}`}>{scoped.filter(matches[key]).length}</span>
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="grid place-items-center gap-2 px-5 py-12 text-center">
            <CheckCircle2 className="text-slate-300" size={32} />
            <p className="text-sm font-semibold text-slate-700">{scoped.length === 0 ? config.emptyTitle : "No matching requests"}</p>
            <p className="max-w-sm text-xs leading-5 text-slate-500">{scoped.length === 0 ? config.emptyText : "Try another keyword or choose a different filter."}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((request) => {
              const actions = actionsFor(request);
              const needsNote = actions.some((action) => action.status === "done" || action.status === "cancelled");
              return (
                <article key={request.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">{request.createdByName}</span>
                    <span className="text-[11px] text-slate-400">→</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{request.assignedToName ?? "Whole team"}</span>
                    <span className="ml-auto"><StatusBadge tone={statusTone(request.status)}>{internalGaStatusLabel[request.status]}</StatusBadge></span>
                  </div>
                  <h3 className="mt-3 break-words text-sm font-bold leading-5 text-slate-900">{request.title}</h3>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{request.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500 sm:text-[11px]">
                    {request.location ? <span className="inline-flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {request.location}</span> : null}
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} className="text-slate-400" /> {formatDate(request.createdAt)}</span>
                    {request.completedAt ? <span className="inline-flex items-center gap-1.5"><Clock3 size={12} className="text-slate-400" /> Finished {formatDate(request.completedAt)}</span> : null}
                  </div>
                  {request.events.length > 1 ? (
                    <details className="mt-3 text-[11px] text-slate-500">
                      <summary className="cursor-pointer select-none font-semibold text-slate-600">History ({request.events.length})</summary>
                      <ol className="mt-2 space-y-1.5 border-l-2 border-slate-100 pl-3">
                        {request.events.map((event) => (
                          <li key={event.id}>
                            <span className="text-slate-700">{internalGaEventText(event)}</span>{" "}
                            <span className="text-slate-400">{formatDateTime(event.createdAt)}</span>
                            {event.note ? <span className="block text-slate-500">Note: {event.note}</span> : null}
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                  {request.resolutionNote ? <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs leading-5 text-slate-600"><b className="font-semibold text-slate-700">Note:</b> {request.resolutionNote}</p> : null}
                  {actions.length ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      {needsNote ? <input value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} maxLength={2000} placeholder={mode === "inbox" ? "Optional note when finishing" : "Optional note when cancelling"} aria-label={`Note for ${request.title}`} className={`h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:ring-2 ${t.focus}`} /> : <span className="flex-1" />}
                      <div className="flex flex-wrap gap-2">
                        {actions.map((action) => {
                          const busy = pending === `${request.id}:${action.status}`;
                          const destructive = action.status === "cancelled";
                          return (
                            <button key={action.status} type="button" disabled={Boolean(pending)} onClick={() => void changeStatus(request, action.status)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition active:scale-95 disabled:opacity-60 ${destructive ? "border border-slate-200 text-slate-600 hover:bg-slate-50" : `${t.primary} text-white`}`}>
                              {busy ? <LoaderCircle size={13} className="animate-spin" /> : null}{action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {mode === "history" && creating ? (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="internal-ga-title">
          <form onSubmit={createRequest} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><h2 id="internal-ga-title" className="text-sm font-bold text-slate-900">New internal request</h2><p className="mt-1 text-xs text-slate-500">Sent to one teammate, or to the whole GA team.</p></div>
              <button type="button" onClick={() => setCreating(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={17} /></button>
            </div>
            <label className="block text-[11px] font-semibold text-slate-600">Addressed to
              <select name="assignedToId" defaultValue="" className={`mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal outline-none focus:ring-2 ${t.focus}`}>
                <option value="">Whole GA team</option>
                {members.filter((member) => member.id !== currentUserId).map((member) => <option key={member.id} value={member.id}>{member.name} · {member.divisionName}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">Title
              <input name="title" required maxLength={200} className={`mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal outline-none focus:ring-2 ${t.focus}`} />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">Description
              <textarea name="description" required rows={4} maxLength={10000} className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:ring-2 ${t.focus}`} />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">Location <span className="font-normal text-slate-400">(optional)</span>
              <input name="location" maxLength={160} className={`mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal outline-none focus:ring-2 ${t.focus}`} />
            </label>
            {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCreating(false)} className="h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
              <button disabled={pending === "create"} className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-white disabled:bg-slate-300 ${t.primary}`}>{pending === "create" ? <LoaderCircle size={14} className="animate-spin" /> : null}{pending === "create" ? "Sending" : "Send request"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

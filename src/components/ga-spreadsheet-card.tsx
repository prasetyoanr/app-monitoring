"use client";

import { ExternalLink, FileSpreadsheet, LoaderCircle, Pencil, Plus, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveGaSpreadsheetAction, setGaSpreadsheetPermissionAction, setGaSpreadsheetViewerAction, setGaSpreadsheetViewerBulkAction } from "@/app/activities/actions";
import type { GaSpreadsheetRecord, GaSpreadsheetViewerOption } from "@/data/ga-workspace";
import { GA_SPREADSHEET_DESCRIPTION_MAX, GA_SPREADSHEET_TITLE_MAX, GA_SPREADSHEET_URL_MAX } from "@/lib/ga-spreadsheet";

const updatedAtFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

function SpreadsheetFields({ report, pending, onCancel }: {
  report?: GaSpreadsheetRecord;
  pending: boolean;
  onCancel: () => void;
}) {
  return <>
    {report ? <input type="hidden" name="reportId" value={report.id} /> : null}
    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Report name
      <input name="title" required minLength={3} maxLength={GA_SPREADSHEET_TITLE_MAX} defaultValue={report?.title ?? ""} disabled={pending} placeholder="Example: Weekly GA Activity Report" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400" />
    </label>
    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Google Sheets link
      <input name="url" type="url" required maxLength={GA_SPREADSHEET_URL_MAX} defaultValue={report?.url ?? ""} disabled={pending} placeholder="https://docs.google.com/spreadsheets/…" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400" />
    </label>
    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">Description
      <textarea name="description" maxLength={GA_SPREADSHEET_DESCRIPTION_MAX} defaultValue={report?.description ?? ""} disabled={pending} rows={2} placeholder="Briefly explain what this spreadsheet contains" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400" />
    </label>
    <div className="flex justify-end gap-2 sm:col-span-2">
      <button type="button" disabled={pending} onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600">Cancel</button>
      <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white disabled:opacity-50">
        {pending ? <LoaderCircle size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Save report
      </button>
    </div>
  </>;
}

export function GaSpreadsheetCard({ memberId, memberName, spreadsheets, enabled, canManagePermission, canEditDetails, viewerCandidates }: {
  memberId: string;
  memberName: string;
  spreadsheets: GaSpreadsheetRecord[];
  enabled: boolean;
  canManagePermission: boolean;
  canEditDetails: boolean;
  viewerCandidates: GaSpreadsheetViewerOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedViewerByReport, setSelectedViewerByReport] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [bulkViewerId, setBulkViewerId] = useState("");

  function changePermission(nextEnabled: boolean) {
    startTransition(async () => {
      setMessage("");
      const result = await setGaSpreadsheetPermissionAction({ memberId, enabled: nextEnabled });
      setMessage(result.ok ? `Spreadsheet access ${nextEnabled ? "enabled" : "disabled"}.` : result.error);
      if (result.ok) router.refresh();
    });
  }

  function save(form: HTMLFormElement) {
    startTransition(async () => {
      setMessage("");
      const result = await saveGaSpreadsheetAction(new FormData(form));
      setMessage(result.ok ? "Spreadsheet report saved." : result.error);
      if (result.ok) {
        setAdding(false);
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function changeViewer(reportId: string, viewerId: string, nextEnabled: boolean) {
    startTransition(async () => {
      setMessage("");
      const result = await setGaSpreadsheetViewerAction({ reportId, viewerId, enabled: nextEnabled });
      setMessage(result.ok ? `Viewer ${nextEnabled ? "added" : "removed"}.` : result.error);
      if (result.ok) {
        setSelectedViewerByReport((current) => ({ ...current, [reportId]: "" }));
        router.refresh();
      }
    });
  }

  function changeViewerBulk(scope: "member" | "all", nextEnabled: boolean) {
    if (!bulkViewerId) return;
    const viewer = viewerCandidates.find((item) => item.id === bulkViewerId)?.name ?? "This account";
    const target = scope === "member" ? `all reports of ${memberName}` : "all reports of every member";
    if (!window.confirm(`${nextEnabled ? "Allow" : "Stop"} ${viewer} ${nextEnabled ? "to view" : "viewing"} ${target}?`)) return;
    startTransition(async () => {
      setMessage("");
      const result = await setGaSpreadsheetViewerBulkAction({ viewerId: bulkViewerId, enabled: nextEnabled, ownerId: scope === "member" ? memberId : undefined });
      setMessage(result.ok
        ? (result.data.changed ? `${viewer} ${nextEnabled ? "can now view" : "no longer views"} ${result.data.changed} ${result.data.changed === 1 ? "report" : "reports"}.` : "Nothing to change.")
        : result.error);
      if (result.ok) router.refresh();
    });
  }

  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Spreadsheet reports · {spreadsheets.length}</h2>
        <p className="mt-1 text-[11px] text-slate-500">Reports for {memberName}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canEditDetails ? <button type="button" onClick={() => { setAdding(true); setEditingId(null); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700"><Plus size={13} /> Add spreadsheet</button> : null}
        {canManagePermission ? <button type="button" disabled={pending} onClick={() => changePermission(!enabled)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium disabled:opacity-50 ${enabled ? "border border-slate-200 text-slate-600" : "bg-indigo-600 text-white"}`}>
          {pending ? <LoaderCircle size={12} className="animate-spin" /> : <ShieldCheck size={12} />}{enabled ? "Disable access" : "Enable access"}
        </button> : null}
      </div>
    </div>

    {canManagePermission ? <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-800">Allow viewing in bulk</p>
      <p className="mt-1 text-[10px] text-slate-500">Give one account access to many reports at once. Per-report access below still works as before.</p>
      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <select aria-label="Select viewer for bulk access" value={bulkViewerId} onChange={(event) => setBulkViewerId(event.target.value)} disabled={pending || !viewerCandidates.length} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700">
          <option value="">Choose account…</option>
          {viewerCandidates.map((viewer) => <option key={viewer.id} value={viewer.id}>{viewer.name} · {viewer.divisionName}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending || !bulkViewerId} onClick={() => changeViewerBulk("member", true)} className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-50">Allow {memberName}&apos;s reports</button>
          <button type="button" disabled={pending || !bulkViewerId} onClick={() => changeViewerBulk("all", true)} className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-50">Allow all members&apos; reports</button>
          <button type="button" disabled={pending || !bulkViewerId} onClick={() => changeViewerBulk("member", false)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 disabled:opacity-50">Remove from {memberName}</button>
          <button type="button" disabled={pending || !bulkViewerId} onClick={() => changeViewerBulk("all", false)} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 disabled:opacity-50">Remove from all</button>
        </div>
      </div>
    </div> : null}

    {adding ? <form onSubmit={(event) => { event.preventDefault(); save(event.currentTarget); }} className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 sm:grid-cols-2">
      <SpreadsheetFields pending={pending} onCancel={() => setAdding(false)} />
    </form> : null}

    {!spreadsheets.length && !adding ? <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
      {enabled ? `No spreadsheet reports for ${memberName} yet.` : "Enable spreadsheet access so this member can add reports."}
    </div> : null}

    {spreadsheets.map((report) => {
      const grantedIds = new Set(report.viewers.map((viewer) => viewer.id));
      const candidates = viewerCandidates.filter((viewer) => !grantedIds.has(viewer.id));
      const selectedViewerId = selectedViewerByReport[report.id] ?? "";
      return <article key={report.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold text-slate-900">{report.title}</h3>
            {report.description ? <p className="mt-1 text-[11px] text-slate-600">{report.description}</p> : null}
            <p className="mt-1 text-[10px] text-slate-400">Updated {updatedAtFormat.format(new Date(report.updatedAt)).replace(",", "")}</p>
          </div>
          <div className="flex gap-2">
            {enabled ? <a href={`/activities/spreadsheet/open?report=${encodeURIComponent(report.id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700"><ExternalLink size={12} /> Open</a> : null}
            {canEditDetails ? <button type="button" onClick={() => { setEditingId(report.id); setAdding(false); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600"><Pencil size={12} /> Edit</button> : null}
          </div>
        </div>
        {editingId === report.id ? <form onSubmit={(event) => { event.preventDefault(); save(event.currentTarget); }} className="grid gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
          <SpreadsheetFields report={report} pending={pending} onCancel={() => setEditingId(null)} />
        </form> : null}
        {canManagePermission ? <div className="border-t border-slate-100 p-4">
          <h4 className="text-xs font-semibold text-slate-900">Who can view</h4>
          <p className="mt-1 text-[10px] text-slate-500">Administrator and owner always have access. Other accounts need permission for this report.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.viewers.length ? report.viewers.map((viewer) => <span key={viewer.id} className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] text-slate-700">
              {viewer.name} <span className="text-slate-400">· {viewer.divisionName}</span>
              <button type="button" disabled={pending} onClick={() => changeViewer(report.id, viewer.id, false)} aria-label={`Remove ${viewer.name} from ${report.title}`} className="rounded p-0.5 text-slate-400 hover:text-red-600 disabled:opacity-50"><X size={13} /></button>
            </span>) : <span className="text-[11px] text-slate-400">No additional viewers.</span>}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select aria-label={`Select viewer for ${report.title}`} value={selectedViewerId} onChange={(event) => setSelectedViewerByReport((current) => ({ ...current, [report.id]: event.target.value }))} disabled={pending || !candidates.length} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700">
              <option value="">Select GA account</option>
              {candidates.map((viewer) => <option key={viewer.id} value={viewer.id}>{viewer.name} · {viewer.divisionName}</option>)}
            </select>
            <button type="button" disabled={pending || !selectedViewerId} onClick={() => changeViewer(report.id, selectedViewerId, true)} className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-50">Allow viewing</button>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Google Sheets sharing must also allow these people. Removing access here does not remove direct Google access.</p>
        </div> : null}
      </article>;
    })}
    {message ? <p role="status" className="rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600">{message}</p> : null}
  </section>;
}

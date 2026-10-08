"use client";

import { ExternalLink, FileSpreadsheet, LoaderCircle, Pencil, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveGaSpreadsheetAction, setGaSpreadsheetPermissionAction } from "@/app/activities/actions";
import type { GaSpreadsheetRecord } from "@/data/ga-workspace";
import { GA_SPREADSHEET_DESCRIPTION_MAX, GA_SPREADSHEET_TITLE_MAX, GA_SPREADSHEET_URL_MAX } from "@/lib/ga-spreadsheet";

const updatedAtFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function GaSpreadsheetCard({
  memberId,
  memberName,
  spreadsheet,
  canManagePermission,
  canEditDetails,
}: {
  memberId: string;
  memberName: string;
  spreadsheet: GaSpreadsheetRecord;
  canManagePermission: boolean;
  canEditDetails: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(canEditDetails && !spreadsheet.hasLink);
  const [message, setMessage] = useState("");

  function changePermission(enabled: boolean) {
    startTransition(async () => {
      setMessage("");
      const result = await setGaSpreadsheetPermissionAction({ memberId, enabled });
      setMessage(result.ok ? `Spreadsheet access ${enabled ? "enabled" : "disabled"}.` : result.error);
      if (result.ok) router.refresh();
    });
  }

  function saveDetails(form: HTMLFormElement) {
    startTransition(async () => {
      setMessage("");
      const result = await saveGaSpreadsheetAction(new FormData(form));
      setMessage(result.ok ? "Spreadsheet report saved." : result.error);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${spreadsheet.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
            <FileSpreadsheet size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">{spreadsheet.hasLink && spreadsheet.enabled && !editing ? spreadsheet.title : "Spreadsheet Report"}</h2>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${spreadsheet.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {spreadsheet.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            
            {spreadsheet.enabled && spreadsheet.hasLink && !editing ? (
              <>
                {spreadsheet.description && <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{spreadsheet.description}</p>}
                {spreadsheet.updatedAt && <p className="mt-1 text-[10px] text-slate-400">Updated {updatedAtFormat.format(new Date(spreadsheet.updatedAt)).replace(",", "")}</p>}
              </>
            ) : (
              <p className="mt-0.5 text-[11px] text-slate-500">External report access for {memberName}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {spreadsheet.enabled && spreadsheet.hasLink && !editing ? (
            <a href={`/activities/spreadsheet/open?member=${encodeURIComponent(memberId)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700">
              <ExternalLink size={12} /> Open
            </a>
          ) : null}
          
          {spreadsheet.enabled && !editing && canEditDetails ? (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50">
              <Pencil size={12} /> Edit
            </button>
          ) : null}
          
          {canManagePermission ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => changePermission(!spreadsheet.enabled)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition disabled:cursor-wait disabled:opacity-60 ${spreadsheet.enabled ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            >
              {pending ? <LoaderCircle size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              {spreadsheet.enabled ? "Disable" : "Enable"}
            </button>
          ) : null}
        </div>
      </div>

      {spreadsheet.enabled && editing ? (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <form onSubmit={(event) => { event.preventDefault(); saveDetails(event.currentTarget); }} className="grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Report name<input name="title" required minLength={3} maxLength={GA_SPREADSHEET_TITLE_MAX} defaultValue={spreadsheet.title} disabled={pending} placeholder="Example: Weekly GA Activity Report" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Google Sheets link<input name="url" type="url" required maxLength={GA_SPREADSHEET_URL_MAX} defaultValue={spreadsheet.url} disabled={pending} placeholder="https://docs.google.com/spreadsheets/…" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">Description<textarea name="description" maxLength={GA_SPREADSHEET_DESCRIPTION_MAX} defaultValue={spreadsheet.description} disabled={pending} rows={2} placeholder="Briefly explain what this spreadsheet contains" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              {spreadsheet.hasLink ? <button type="button" disabled={pending} onClick={() => setEditing(false)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[11px] font-medium text-slate-600 hover:bg-slate-50"><X size={12} /> Cancel</button> : null}
              <button type="submit" disabled={pending} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-[11px] font-medium text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60">{pending ? <LoaderCircle size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />} Save</button>
            </div>
          </form>
        </div>
      ) : spreadsheet.enabled && !spreadsheet.hasLink ? (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-center">
          <p className="text-xs font-medium text-slate-600">Waiting for {memberName} to add the spreadsheet report.</p>
        </div>
      ) : null}

      {message ? <p role="status" className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[10px] font-medium text-slate-600">{message}</p> : null}
    </section>
  );
}

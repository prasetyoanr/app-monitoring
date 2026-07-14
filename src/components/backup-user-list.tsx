"use client";

import { Check, Eye, Filter, FolderSync, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { Card, StatusBadge } from "@/components/ui";
import type { BackupRecord } from "@/data/mock-data";

type FormMode = "create" | "edit" | null;

function statusTone(status: string): "green" | "amber" | "red" | "gray" {
  if (status === "Success") return "green";
  if (status === "Overdue") return "amber";
  if (status === "Failed") return "red";
  return "gray";
}

function formatDateTime(value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year.slice(-2)} ${time}`;
}

export function BackupUserList() {
  const { backupRecords, addBackup, updateBackup, deleteBackup } = useAppData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [mode, setMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<BackupRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<BackupRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BackupRecord | null>(null);

  const filtered = useMemo(() => backupRecords.filter((record) => {
    const matchesQuery = `${record.user} ${record.username} ${record.email} ${record.syncPath} ${record.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "All Status" || record.status === status);
  }), [backupRecords, query, status]);

  function openForm(nextMode: Exclude<FormMode, null>, record: BackupRecord | null = null) {
    setSelected(record);
    setMode(nextMode);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lastBackupIso = String(data.get("lastBackupIso"));
    const maxNumber = backupRecords.reduce((max, item) => Math.max(max, Number(item.id.split("-").at(-1)) || 0), 0);
    const record: BackupRecord = {
      id: selected?.id ?? `BKU-2026-${String(maxNumber + 1).padStart(4, "0")}`,
      user: String(data.get("user")),
      username: String(data.get("username")),
      email: String(data.get("email")),
      password: String(data.get("password")),
      syncPath: String(data.get("syncPath")),
      lastBackupIso,
      lastBackup: formatDateTime(lastBackupIso),
      status: String(data.get("status")),
    };
    if (mode === "edit") updateBackup(record); else addBackup(record);
    setMode(null);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative max-w-md flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs outline-none" placeholder="Search user or sync path..." /></label>
          <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 min-w-40 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-600 outline-none"><option>All Status</option><option>Success</option><option>Overdue</option><option>Failed</option><option>Pending</option></select></label>
        </div>
        <button onClick={() => openForm("create")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-[#2445b5]"><Plus size={16} /> Add Record</button>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-800">Backup User Records</h2><p className="mt-1 text-[11px] text-slate-500">Maintained manually by the IT team</p></div><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{filtered.length} records</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-slate-50/90 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="w-16 px-5 py-3.5 text-center">No.</th><th className="px-4 py-3.5">User</th><th className="px-4 py-3.5">Sync Folder Path</th><th className="px-4 py-3.5">Last Backup</th><th className="px-4 py-3.5">Status</th><th className="w-32 px-4 py-3.5 text-center">Account Data</th><th className="w-36 px-5 py-3.5 text-center">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((record, index) => (
                <tr key={record.id} className="text-xs hover:bg-slate-50/70">
                  <td className="px-5 py-4 text-center text-[11px] font-semibold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-4"><p className="font-semibold text-slate-800">{record.user}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{record.id}</p></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 font-mono text-[10px] text-slate-600"><FolderSync size={14} className="shrink-0 text-slate-400" />{record.syncPath}</span></td>
                  <td className="px-4 py-4 text-[11px] text-slate-600">{record.lastBackup}</td>
                  <td className="px-4 py-4"><StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge></td>
                  <td className="px-4 py-4 text-center">{record.username.trim() && record.password.trim() ? <span className="mx-auto grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-600" title="Username and password available"><Check size={16} strokeWidth={2.5} /><span className="sr-only">Username and password available</span></span> : <span className="mx-auto grid size-8 place-items-center rounded-full bg-rose-50 text-rose-600" title="Username or password unavailable"><X size={16} strokeWidth={2.5} /><span className="sr-only">Username or password unavailable</span></span>}</td>
                  <td className="px-5 py-4"><div className="flex justify-center gap-2"><button onClick={() => setDetailRecord(record)} className="grid size-8 place-items-center rounded-lg bg-[#3157d5] text-white shadow-sm transition hover:bg-[#2445b5]" aria-label={`View details ${record.user}`} title="Detail"><Eye size={14} /></button><button onClick={() => openForm("edit", record)} className="grid size-8 place-items-center rounded-lg bg-amber-500 text-white shadow-sm transition hover:bg-amber-600" aria-label={`Edit ${record.user}`} title="Edit"><Pencil size={14} /></button><button onClick={() => setPendingDelete(record)} className="grid size-8 place-items-center rounded-lg bg-rose-600 text-white shadow-sm transition hover:bg-rose-700" aria-label={`Delete ${record.user}`} title="Delete"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? <div className="px-5 py-14 text-center text-xs text-slate-500">No backup records found.</div> : null}
        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">Showing {filtered.length} of {backupRecords.length} records</div>
      </Card>

      {detailRecord ? (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="backup-document-title">
          <div className="mx-auto my-4 w-full max-w-3xl rounded-sm bg-white shadow-2xl sm:my-8">
            <div className="flex justify-end border-b border-slate-200 px-5 py-3"><button onClick={() => setDetailRecord(null)} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Close backup detail"><X size={18} /></button></div>
            <article className="px-6 py-8 text-slate-800 sm:px-12 sm:py-10">
              <header className="border-b-2 border-slate-900 pb-5 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Internal IT Department</p><h2 id="backup-document-title" className="mt-2 text-xl font-bold uppercase tracking-wide text-slate-950">Backup User Record</h2><p className="mt-2 font-mono text-xs text-slate-500">Document No. {detailRecord.id}</p></header>
              <section className="mt-8" aria-labelledby="account-information-title">
                <h3 id="account-information-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Account Information</h3>
                <dl className="mt-4 grid gap-x-10 gap-y-4 text-xs sm:grid-cols-2">
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">User</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.user}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Username</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.username}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Email</dt><dd className="mt-1 break-all font-medium text-slate-800">{detailRecord.email}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Password Information</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-slate-800">{detailRecord.password}</dd></div>
                </dl>
              </section>
              <section className="mt-8" aria-labelledby="backup-information-title">
                <h3 id="backup-information-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Backup Information</h3>
                <dl className="mt-4 grid gap-x-10 gap-y-4 text-xs sm:grid-cols-2">
                  <div className="sm:col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sync Folder Path</dt><dd className="mt-1 break-all font-mono text-slate-800">{detailRecord.syncPath}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last Backup</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.lastBackup}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.status}</dd></div>
                </dl>
              </section>
              <footer className="mt-12 border-t border-slate-300 pt-4 text-[10px] leading-5 text-slate-400">This document is an internal backup user record generated from the IT Monitoring System.</footer>
            </article>
          </div>
        </div>
      ) : null}

      {mode ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="backup-form-title">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="backup-form-title" className="text-sm font-bold text-slate-900">{mode === "create" ? "Add Backup Record" : "Edit Backup Record"}</h2><p className="mt-1 text-[11px] text-slate-500">This record is maintained by the IT team.</p></div><button onClick={() => setMode(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button></div>
            <form key={`${mode}-${selected?.id ?? "new"}`} className="space-y-4 p-5" onSubmit={handleSubmit}>
              <label className="block text-[11px] font-semibold text-slate-600">User Name<input name="user" required defaultValue={selected?.user} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Enter user name" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Username<input name="username" required defaultValue={selected?.username} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Enter username" /></label><label className="block text-[11px] font-semibold text-slate-600">Email<input name="email" required type="email" defaultValue={selected?.email} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="name@example.com" /></label></div>
              <label className="block text-[11px] font-semibold text-slate-600">Password Information<input name="password" required type="text" defaultValue={selected?.password} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Enter password information" /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Sync Folder Path<input name="syncPath" required defaultValue={selected?.syncPath} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none" placeholder="C:\\Users\\Name\\Documents" /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Last Backup<input name="lastBackupIso" required type="datetime-local" defaultValue={selected?.lastBackupIso ?? "2026-07-13T09:00"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Status<select name="status" required defaultValue={selected?.status ?? "Success"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"><option>Success</option><option>Overdue</option><option>Failed</option><option>Pending</option></select></label>
              <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setMode(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button className="h-10 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white">Save Record</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-sm font-bold text-slate-900">Delete backup record?</h2><p className="mt-2 text-xs leading-5 text-slate-500">The record for <b>{pendingDelete.user}</b> will be removed from this frontend session.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setPendingDelete(null)} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button onClick={() => { deleteBackup(pendingDelete.id); setPendingDelete(null); }} className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white">Delete</button></div></div></div>
      ) : null}
    </>
  );
}

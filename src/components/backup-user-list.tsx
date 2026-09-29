"use client";

import { Check, Eye, Filter, FolderSync, Link2, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react";
import {
  deleteBackupAction,
  getBackupCredentialAction,
  saveBackupAction,
} from "@/app/backups/actions";
import { BackupInvitationModal } from "@/components/backup-invitation-modal";
import { Card, StatusBadge } from "@/components/ui";
import type { BackupRecord } from "@/data/types";

type FormMode = "create" | "edit" | null;

function statusTone(status: string): "green" | "amber" | "red" | "gray" {
  if (status === "Success") return "green";
  if (status === "Overdue") return "amber";
  if (status === "Failed") return "red";
  return "gray";
}

function AccountDataIndicator({ record }: { record: BackupRecord }) {
  const complete = Boolean(
    record.username.trim() && record.hasPasswordInformation,
  );

  return complete ? (
    <span className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-600" title="Username and password available">
      <Check size={16} strokeWidth={2.5} />
      <span className="sr-only">Username and password available</span>
    </span>
  ) : (
    <span className="grid size-8 place-items-center rounded-full bg-rose-50 text-rose-600" title="Username or password unavailable">
      <X size={16} strokeWidth={2.5} />
      <span className="sr-only">Username or password unavailable</span>
    </span>
  );
}

export function BackupUserList({ initialRecords, canManage, divisionOptions }: { initialRecords: BackupRecord[]; canManage: boolean; divisionOptions: string[] }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const backupRecords = initialRecords;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [mode, setMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<BackupRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<BackupRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BackupRecord | null>(null);
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formCredential, setFormCredential] = useState("");
  const [formCredentialLoading, setFormCredentialLoading] = useState(false);
  const [formCredentialLoadFailed, setFormCredentialLoadFailed] = useState(false);
  const [detailCredential, setDetailCredential] = useState("");
  const [detailCredentialLoading, setDetailCredentialLoading] = useState(false);
  const [divisionSelection, setDivisionSelection] = useState(divisionOptions[0] ?? "");
  const [customDivision, setCustomDivision] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const formCredentialRequest = useRef(0);
  const detailCredentialRequest = useRef(0);

  const filtered = useMemo(() => backupRecords.filter((record) => {
    const matchesQuery = `${record.user} ${record.division} ${record.username} ${record.email} ${record.syncPath} ${record.id}`.toLowerCase().includes(deferredQuery);
    return matchesQuery && (status === "All Status" || record.status === status);
  }), [backupRecords, deferredQuery, status]);

  function openForm(nextMode: Exclude<FormMode, null>, record: BackupRecord | null = null) {
    setSelected(record);
    setFormError("");
    const division = record?.division || divisionOptions[0] || "Other";
    setDivisionSelection(divisionOptions.includes(division) ? division : "Other");
    setCustomDivision(divisionOptions.includes(division) ? "" : division);
    setFormCredential("");
    setFormCredentialLoadFailed(false);
    setMode(nextMode);
    const requestId = ++formCredentialRequest.current;
    if (record?.hasPasswordInformation) {
      setFormCredentialLoading(true);
      void getBackupCredentialAction(record.id).then((result) => {
        if (requestId !== formCredentialRequest.current) return;
        setFormCredentialLoading(false);
        if (result.ok) setFormCredential(result.data.passwordInformation);
        else {
          setFormCredentialLoadFailed(true);
          setFormError(result.error);
        }
      });
    } else {
      setFormCredentialLoading(false);
    }
  }

  function openDetail(record: BackupRecord) {
    setDetailRecord(record);
    setDetailCredential("");
    const requestId = ++detailCredentialRequest.current;
    if (!canManage || !record.hasPasswordInformation) {
      setDetailCredentialLoading(false);
      return;
    }
    setDetailCredentialLoading(true);
    void getBackupCredentialAction(record.id).then((result) => {
      if (requestId !== detailCredentialRequest.current) return;
      setDetailCredentialLoading(false);
      if (result.ok) setDetailCredential(result.data.passwordInformation);
      else setDetailCredential("Unable to load password");
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (selected) data.set("id", selected.id);
    data.set(
      "division",
      divisionSelection === "Other" ? customDivision : divisionSelection,
    );
    setSaving(true);
    setFormError("");
    const result = await saveBackupAction(data);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setMode(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setSaving(true);
    setFormError("");
    const result = await deleteBackupAction(pendingDelete.id);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setPendingDelete(null);
    router.refresh();
  }

  function refreshRecords() {
    startRefresh(() => router.refresh());
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="relative max-w-md flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs outline-none" placeholder="Search user or sync path..." /></label>
          <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full min-w-40 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-600 outline-none sm:w-auto"><option>All Status</option><option>Success</option><option>Overdue</option><option>Failed</option><option>Pending</option></select></label>
        </div>
        <div className={`grid gap-2 ${canManage ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
          <button type="button" onClick={refreshRecords} disabled={isRefreshing} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 disabled:text-slate-400" aria-label="Refresh backup records">
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          {canManage ? <><button onClick={() => setInvitationOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#3157d5] bg-white px-4 text-xs font-semibold text-[#3157d5]"><Link2 size={16} /> Client Link</button><button onClick={() => openForm("create")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-[#2445b5]"><Plus size={16} /> Add Record</button></> : null}
        </div>
      </div>

      <Card className="table-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-bold text-slate-800">Backup User Records</h2><p className="mt-1 text-[11px] text-slate-500">Maintained manually by the IT team</p></div><span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{filtered.length} records</span></div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filtered.map((record) => (
            <article key={record.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-800">{record.user}</h3><p className="mt-1 text-[10px] text-slate-500">{record.division}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{record.id}</p></div>
                <StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Sync Folder Path</p><p className="mt-1.5 flex items-start gap-2 break-all font-mono text-[10px] leading-5 text-slate-600"><FolderSync size={14} className="mt-0.5 shrink-0 text-slate-400" />{record.syncPath}</p></div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Submitted At</p><p className="mt-1.5 text-[11px] font-medium text-slate-700">{record.submittedAt}</p></div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Account Data</p><AccountDataIndicator record={record} /></div>
              </div>
              <div className={`mt-4 gap-2 border-t border-slate-100 pt-4 ${canManage ? "grid grid-cols-3" : "flex"}`}>
                <button onClick={() => openDetail(record)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#3157d5] px-2 text-[10px] font-semibold text-white" aria-label={`View details ${record.user}`}><Eye size={13} /> Details</button>
                {canManage ? <><button onClick={() => openForm("edit", record)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-2 text-[10px] font-semibold text-white" aria-label={`Edit ${record.user}`}><Pencil size={13} /> Edit</button><button onClick={() => setPendingDelete(record)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2 text-[10px] font-semibold text-white" aria-label={`Delete ${record.user}`}><Trash2 size={13} /> Delete</button></> : null}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-slate-50/90 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="w-16 px-5 py-3.5 text-center">No.</th><th className="px-4 py-3.5">User</th><th className="px-4 py-3.5">Sync Folder Path</th><th className="px-4 py-3.5">Submitted At</th><th className="px-4 py-3.5">Status</th><th className="w-32 px-4 py-3.5 text-center">Account Data</th><th className="w-36 px-5 py-3.5 text-center">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((record, index) => (
                <tr key={record.id} className="text-xs">
                  <td className="px-5 py-4 text-center text-[11px] font-semibold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-4"><p className="font-semibold text-slate-800">{record.user}</p><p className="mt-1 text-[10px] text-slate-500">{record.division}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{record.id}</p></td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-2 font-mono text-[10px] text-slate-600"><FolderSync size={14} className="shrink-0 text-slate-400" />{record.syncPath}</span></td>
                  <td className="px-4 py-4 text-[11px] text-slate-600">{record.submittedAt}</td>
                  <td className="px-4 py-4"><StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge></td>
                  <td className="px-4 py-4"><div className="flex justify-center"><AccountDataIndicator record={record} /></div></td>
                  <td className="px-5 py-4"><div className="flex justify-center gap-2"><button onClick={() => openDetail(record)} className="grid size-8 place-items-center rounded-lg bg-[#3157d5] text-white shadow-sm transition hover:bg-[#2445b5]" aria-label={`View details ${record.user}`} title="Details"><Eye size={14} /></button>{canManage ? <><button onClick={() => openForm("edit", record)} className="grid size-8 place-items-center rounded-lg bg-amber-500 text-white shadow-sm transition hover:bg-amber-600" aria-label={`Edit ${record.user}`} title="Edit"><Pencil size={14} /></button><button onClick={() => setPendingDelete(record)} className="grid size-8 place-items-center rounded-lg bg-rose-600 text-white shadow-sm transition hover:bg-rose-700" aria-label={`Delete ${record.user}`} title="Delete"><Trash2 size={14} /></button></> : null}</div></td>
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
            <div className="flex justify-end border-b border-slate-200 px-5 py-3"><button onClick={() => { detailCredentialRequest.current += 1; setDetailRecord(null); }} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Close backup detail"><X size={18} /></button></div>
            <article className="px-6 py-8 text-slate-800 sm:px-12 sm:py-10">
              <header className="border-b-2 border-slate-900 pb-5 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Internal IT Department</p><h2 id="backup-document-title" className="mt-2 text-xl font-bold uppercase tracking-wide text-slate-950">Backup User Record</h2><p className="mt-2 font-mono text-xs text-slate-500">Document No. {detailRecord.id}</p></header>
              <section className="mt-8" aria-labelledby="account-information-title">
                <h3 id="account-information-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Account Information</h3>
                <dl className="mt-4 grid gap-x-10 gap-y-4 text-xs sm:grid-cols-2">
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">User</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.user}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Division</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.division}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Username</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.username}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Email</dt><dd className="mt-1 break-all font-medium text-slate-800">{detailRecord.email}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Synology Password</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-800">{canManage ? detailCredentialLoading ? "Loading..." : (detailCredential || "Not available") : detailRecord.hasPasswordInformation ? "Available — restricted to IT team" : "Not available"}</dd></div>
                </dl>
              </section>
              <section className="mt-8" aria-labelledby="backup-information-title">
                <h3 id="backup-information-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Backup Information</h3>
                <dl className="mt-4 grid gap-x-10 gap-y-4 text-xs sm:grid-cols-2">
                  <div className="sm:col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sync Folder Path</dt><dd className="mt-1 break-all font-mono text-slate-800">{detailRecord.syncPath}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Submitted At</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.submittedAt}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.status}</dd></div>
                </dl>
              </section>
              <footer className="mt-12 border-t border-slate-300 pt-4 text-[10px] leading-5 text-slate-400">This document is an internal backup user record generated from General Affairs Management System.</footer>
            </article>
          </div>
        </div>
      ) : null}

      {mode ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="backup-form-title">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="backup-form-title" className="text-sm font-bold text-slate-900">{mode === "create" ? "Add Backup Record" : "Edit Backup Record"}</h2><p className="mt-1 text-[11px] text-slate-500">This record is maintained by the IT team.</p></div><button onClick={() => { formCredentialRequest.current += 1; setMode(null); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button></div>
            <form key={`${mode}-${selected?.id ?? "new"}`} className="space-y-4 p-5" onSubmit={handleSubmit}>
              <label className="block text-[11px] font-semibold text-slate-600">User Name<input name="user" required defaultValue={selected?.user} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Enter user name" /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Division<select required value={divisionSelection} onChange={(event) => setDivisionSelection(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{divisionOptions.map((division) => <option key={division} value={division}>{division}</option>)}<option value="Other">Other</option></select></label>
              {divisionSelection === "Other" ? <label className="block text-[11px] font-semibold text-slate-600">Other Division<input required value={customDivision} onChange={(event) => setCustomDivision(event.target.value)} maxLength={120} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Enter division name" /></label> : null}
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Username<input name="username" required defaultValue={selected?.username} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Enter username" /></label><label className="block text-[11px] font-semibold text-slate-600">Email<input name="email" required type="email" defaultValue={selected?.email} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="name@example.com" /></label></div>
              <label className="block text-[11px] font-semibold text-slate-600">Synology Password<input name="passwordInformation" type="text" value={formCredential} onChange={(event) => setFormCredential(event.target.value)} disabled={formCredentialLoading || formCredentialLoadFailed} maxLength={2000} autoComplete="off" spellCheck={false} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none disabled:bg-slate-100" placeholder={formCredentialLoading ? "Loading password..." : "Enter Synology password"} /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Sync Folder Path <span className="font-normal text-slate-400">(Optional)</span><input name="syncPath" defaultValue={selected?.syncPath === "Waiting for IT setup" ? "" : selected?.syncPath} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none" placeholder="C:\\Users\\Name\\Documents" /></label>
              <p className="rounded-xl bg-blue-50 p-3 text-[10px] leading-5 text-blue-700">Submitted At is recorded automatically only when the client sends the form through an invitation link.</p>
              <label className="block text-[11px] font-semibold text-slate-600">Status<select name="status" required defaultValue={selected?.status ?? "Pending"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"><option>Success</option><option>Overdue</option><option>Failed</option><option>Pending</option></select></label>
              {formError ? <p className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{formError}</p> : null}
              <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => { formCredentialRequest.current += 1; setMode(null); }} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving || formCredentialLoading || formCredentialLoadFailed} className="h-10 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white disabled:bg-slate-300">{saving ? "Saving..." : "Save Record"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-sm font-bold text-slate-900">Delete backup record?</h2><p className="mt-2 text-xs leading-5 text-slate-500">The record for <b>{pendingDelete.user}</b> will be permanently removed from the database.</p>{formError ? <p className="mt-3 text-[11px] font-semibold text-rose-600">{formError}</p> : null}<div className="mt-5 flex justify-end gap-2"><button onClick={() => setPendingDelete(null)} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} onClick={confirmDelete} className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white disabled:bg-slate-300">{saving ? "Deleting..." : "Delete"}</button></div></div></div>
      ) : null}

      {invitationOpen ? <BackupInvitationModal onClose={() => setInvitationOpen(false)} /> : null}
    </>
  );
}

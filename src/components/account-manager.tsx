"use client";

import {
  KeyRound,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createAccountAction,
  deleteAccountAction,
  resetAccountPasswordAction,
  updateAccountAction,
} from "@/app/accounts/actions";
import { Card, StatusBadge } from "@/components/ui";
import type { AccountRecord } from "@/data/types";
import { accountRoleRequiresDivision } from "@/lib/account-role";

function roleLabel(role: AccountRecord["role"]) {
  if (role === "administrator") return "Administrator";
  if (role === "receptionist") return "GA Admin";
  if (role === "approver") return "GA Supervisor";
  if (role === "final_approver") return "Senior Approver";
  if (role === "service_agent") return "GA Member";
  return "Requester";
}

const roleOptions: Array<{ value: AccountRecord["role"]; label: string }> = [
  { value: "requester", label: "Requester" },
  { value: "receptionist", label: "GA Admin" },
  { value: "approver", label: "GA Supervisor" },
  { value: "final_approver", label: "Senior Approver" },
  { value: "service_agent", label: "GA Member" },
  { value: "administrator", label: "Administrator" },
];

type DivisionOption = { id: string; name: string };

function divisionScopeLabel(account: AccountRecord) {
  return accountRoleRequiresDivision(account.role)
    ? account.division ?? "Not assigned"
    : "Global / all divisions";
}

export function AccountManager({
  initialAccounts,
  currentUserId,
  divisions,
}: {
  initialAccounts: AccountRecord[];
  currentUserId: string;
  divisions: DivisionOption[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AccountRecord | null>(null);
  const [editTarget, setEditTarget] = useState<AccountRecord | null>(null);
  const [createRole, setCreateRole] = useState<AccountRecord["role"]>("requester");
  const [editRole, setEditRole] = useState<AccountRecord["role"]>("requester");
  const [deleteTarget, setDeleteTarget] = useState<AccountRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await createAccountAction(new FormData(event.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCreateOpen(false);
    router.refresh();
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setSaving(true);
    setError("");
    const result = await resetAccountPasswordAction(resetTarget.id, password);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResetTarget(null);
    router.refresh();
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setError("");
    const result = await updateAccountAction(editTarget.id, new FormData(event.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditTarget(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    const result = await deleteAccountAction(deleteTarget.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  function openCreate() {
    setError("");
    setCreateRole("requester");
    setCreateOpen(true);
  }

  function openReset(account: AccountRecord) {
    setError("");
    setResetTarget(account);
  }

  function openEdit(account: AccountRecord) {
    setError("");
    setEditRole(account.role);
    setEditTarget(account);
  }

  function openDelete(account: AccountRecord) {
    setError("");
    setDeleteTarget(account);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#3157d5]"><UsersRound size={17} /></span>
          <span><b className="text-slate-800">{initialAccounts.length}</b> registered accounts</span>
        </div>
        <button onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-[#2445b5]"><Plus size={16} /> Add Account</button>
      </div>

      {error && !createOpen && !resetTarget && !editTarget && !deleteTarget ? <p role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</p> : null}

      <Card className="table-card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-sm font-bold text-slate-800">Account List</h2><p className="mt-1 text-[11px] text-slate-500">Only administrators can manage account access.</p></div>

        <div className="divide-y divide-slate-100 md:hidden">
          {initialAccounts.map((account) => (
            <article key={account.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${account.role === "administrator" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}><UserCog size={18} /></span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-800">{account.name}</h3>{account.id === currentUserId ? <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">Your Account</span> : null}</div><p className="mt-1 text-[10px] text-slate-500">@{account.username}</p></div>
                <StatusBadge tone={!account.isActive || account.isLocked ? "amber" : "green"}>{!account.isActive ? "Inactive" : account.isLocked ? "Locked" : "Active"}</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-[11px]"><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Role</p><p className="mt-1 font-semibold text-slate-700">{roleLabel(account.role)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Scope</p><p className="mt-1 font-semibold text-slate-700">{divisionScopeLabel(account)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Created</p><p className="mt-1 font-semibold text-slate-700">{account.createdAt}</p></div>{account.isLocked ? <p className="col-span-2 text-[10px] font-semibold text-amber-600">This account is temporarily locked after failed login attempts.</p> : null}</div>
              <div className="mt-4 grid grid-cols-3 gap-2"><button onClick={() => openEdit(account)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 text-[10px] font-semibold text-white"><Pencil size={13} /> Edit</button><button onClick={() => openReset(account)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-2 text-[10px] font-semibold text-white"><KeyRound size={13} /> Reset</button><button disabled={saving || account.id === currentUserId} onClick={() => openDelete(account)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Trash2 size={13} /> Delete</button></div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50/90 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">User</th><th className="px-4 py-3.5">Username</th><th className="px-4 py-3.5">Role</th><th className="px-4 py-3.5">Scope</th><th className="px-4 py-3.5">Created</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {initialAccounts.map((account) => (
                <tr key={account.id} className="text-xs">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${account.role === "administrator" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}><UserCog size={16} /></span><div><p className="font-semibold text-slate-800">{account.name} {account.id === currentUserId ? <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700">You</span> : null}</p></div></div></td>
                  <td className="px-4 py-4 font-mono text-[11px] text-slate-600">@{account.username}</td>
                  <td className="px-4 py-4"><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${account.role === "administrator" ? "bg-blue-50 text-blue-700" : account.role === "service_agent" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>{roleLabel(account.role)}</span></td>
                  <td className="px-4 py-4 text-[11px] text-slate-600">{divisionScopeLabel(account)}</td>
                  <td className="px-4 py-4 text-[11px] text-slate-500">{account.createdAt}</td>
                  <td className="px-4 py-4"><StatusBadge tone={!account.isActive || account.isLocked ? "amber" : "green"}>{!account.isActive ? "Inactive" : account.isLocked ? "Locked" : "Active"}</StatusBadge></td>
                  <td className="px-5 py-4"><div className="flex justify-center gap-2"><button onClick={() => openEdit(account)} className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white" title="Edit account" aria-label={`Edit ${account.username}`}><Pencil size={14} /></button><button onClick={() => openReset(account)} className="grid size-8 place-items-center rounded-lg bg-amber-500 text-white" title="Reset Password" aria-label={`Reset password ${account.username}`}><KeyRound size={14} /></button><button disabled={saving || account.id === currentUserId} onClick={() => openDelete(account)} className="grid size-8 place-items-center rounded-lg bg-rose-600 text-white disabled:cursor-not-allowed disabled:bg-slate-300" title="Delete" aria-label={`Delete ${account.username}`}><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {createOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-account-title">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="create-account-title" className="text-sm font-bold text-slate-900">Add User</h2><p className="mt-1 text-[11px] text-slate-500">GA Admins and supervisors work globally; Requesters and GA Members follow their assigned division or unit.</p></div><button onClick={() => setCreateOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button></div>
            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Username<input name="username" required minLength={3} maxLength={80} autoCapitalize="none" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="user.name" /></label><label className="block text-[11px] font-semibold text-slate-600">Role<select name="role" value={createRole} onChange={(event) => setCreateRole(event.target.value as AccountRecord["role"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
              <label className="block text-[11px] font-semibold text-slate-600">Division / Unit<span className="mt-1 block text-[9px] font-normal text-slate-400">{accountRoleRequiresDivision(createRole) ? "Required for Requesters and GA Members." : "This role works globally and is not tied to a division."}</span><select key={createRole} name="divisionId" defaultValue="" disabled={!accountRoleRequiresDivision(createRole)} required={accountRoleRequiresDivision(createRole)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><option value="">{accountRoleRequiresDivision(createRole) ? "Select division / unit" : "Global / all divisions"}</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label>
              <label className="block text-[11px] font-semibold text-slate-600">Initial Password<input name="password" required type="password" minLength={6} maxLength={128} autoComplete="new-password" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Minimum 6 characters" /><span className="mt-1.5 block text-[9px] font-normal leading-4 text-slate-400">The password is stored as a hash and cannot be viewed later.</span></label>
              {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} className="h-10 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white disabled:bg-slate-300">{saving ? "Saving..." : "Save Account"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-account-title">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="edit-account-title" className="text-sm font-bold text-slate-900">Edit User</h2><p className="mt-1 text-[11px] text-slate-500">Manage the user role, division scope, and access status.</p></div><button onClick={() => setEditTarget(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button></div>
            <form onSubmit={handleUpdate} className="space-y-4 p-5">
              <label className="block text-[11px] font-semibold text-slate-600">Full Name<input name="name" required maxLength={120} defaultValue={editTarget.name} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Role<select name="role" value={editRole} onChange={(event) => setEditRole(event.target.value as AccountRecord["role"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="block text-[11px] font-semibold text-slate-600">Status<select name="isActive" defaultValue={editTarget.isActive ? "true" : "false"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"><option value="true">Active</option><option value="false">Inactive</option></select></label></div>
              <label className="block text-[11px] font-semibold text-slate-600">Division / Unit<span className="mt-1 block text-[9px] font-normal text-slate-400">{accountRoleRequiresDivision(editRole) ? "Required for Requesters and GA Members." : "This role works globally and is not tied to a division."}</span><select key={`${editTarget.id}-${editRole}`} name="divisionId" defaultValue={accountRoleRequiresDivision(editRole) ? editTarget.divisionId ?? "" : ""} disabled={!accountRoleRequiresDivision(editRole)} required={accountRoleRequiresDivision(editRole)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><option value="">{accountRoleRequiresDivision(editRole) ? "Select division / unit" : "Global / all divisions"}</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label>
              {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditTarget(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} className="h-10 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white disabled:bg-slate-300">{saving ? "Saving..." : "Save Changes"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="delete-account-title" className="text-sm font-bold text-slate-900">Delete Account?</h2><p className="mt-1 text-[11px] text-slate-500">This action cannot be undone.</p></div><button onClick={() => setDeleteTarget(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close confirmation"><X size={18} /></button></div>
            <div className="space-y-4 p-5">
              <p className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">Account <b>@{deleteTarget.username}</b> will be permanently deleted. Existing request history will remain available.</p>
              {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} onClick={confirmDelete} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white disabled:bg-slate-300"><Trash2 size={14} /> {saving ? "Deleting..." : "Delete Account"}</button></div>
            </div>
          </div>
        </div>
      ) : null}

      {resetTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="reset-password-title" className="text-sm font-bold text-slate-900">Reset Password</h2><p className="mt-1 text-[11px] text-slate-500">Account @{resetTarget.username} will be signed out from all sessions.</p></div><button onClick={() => setResetTarget(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button></div>
            <form onSubmit={handlePasswordReset} className="space-y-4 p-5"><label className="block text-[11px] font-semibold text-slate-600">New Password<input name="password" required type="password" minLength={6} maxLength={128} autoComplete="new-password" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="Minimum 6 characters" /></label>{error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={() => setResetTarget(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} className="h-10 rounded-xl bg-amber-500 px-4 text-xs font-semibold text-white disabled:bg-slate-300">{saving ? "Processing..." : "Reset Password"}</button></div></form>
          </div>
        </div>
      ) : null}
    </>
  );
}

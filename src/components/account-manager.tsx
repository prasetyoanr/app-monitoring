"use client";

import {
  ChevronDown,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  createAccountAction,
  deleteAccountAction,
  resetAccountPasswordAction,
  updateAccountAction,
} from "@/app/accounts/actions";
import { Card, StatusBadge } from "@/components/ui";
import type { AccountRecord } from "@/data/types";
import { accountRoleAllowsDivision, accountRoleRequiresDivision } from "@/lib/account-role";

function roleLabel(role: AccountRecord["role"]) {
  if (role === "administrator") return "Administrator";
  if (role === "receptionist") return "Admin";
  if (role === "approver") return "First Approval";
  if (role === "final_approver") return "Final Approval";
  if (role === "service_agent") return "Staff";
  return "Requester";
}

const roleOptions: Array<{ value: AccountRecord["role"]; label: string }> = [
  { value: "requester", label: "Requester" },
  { value: "receptionist", label: "Admin" },
  { value: "approver", label: "First Approval" },
  { value: "final_approver", label: "Final Approval" },
  { value: "service_agent", label: "Staff" },
  { value: "administrator", label: "Administrator" },
];

type DivisionOption = { id: string; name: string };

function divisionScopeLabel(account: AccountRecord) {
  if (accountRoleRequiresDivision(account.role)) return account.division ?? "Not assigned";
  return accountRoleAllowsDivision(account.role) && account.division ? account.division : "Global / all divisions";
}

function divisionHint(role: AccountRecord["role"]) {
  if (accountRoleRequiresDivision(role)) return "Required for Requesters and Staff.";
  if (accountRoleAllowsDivision(role)) return "Optional. Leave as Global to work across all divisions, or pick a division.";
  return "The administrator works globally and is not tied to a division.";
}

function PresenceDot({ online, light = false, className = "" }: { online: boolean; light?: boolean; className?: string }) {
  return <span aria-hidden="true" data-online={online} data-tone={light ? "light" : undefined} className={`presence-dot ${className}`} />;
}

function PresenceLine({ account, compact = false }: { account: AccountRecord; compact?: boolean }) {
  const online = account.presence === "online";
  const title = online ? "A tab was open in the last 90 seconds" : `Last activity: ${account.lastSeenLabel}`;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${online ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-500/15"}`}
    >
      <PresenceDot online={online} />
      {online ? "Online" : compact || account.lastSeenLabel === "Not seen yet" ? "Offline" : `Offline · ${account.lastSeenLabel}`}
    </span>
  );
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
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const onlineCount = initialAccounts.filter((account) => account.presence === "online").length;
  const shownAccounts = onlineOnly ? initialAccounts.filter((account) => account.presence === "online") : initialAccounts;

  // Keep "online" fresh while this page stays open.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [router]);

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
          <button
            type="button"
            aria-pressed={onlineOnly}
            onClick={() => setOnlineOnly((value) => !value)}
            title="Show only accounts with an open tab in the last 90 seconds"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${onlineOnly ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
          >
            <PresenceDot online={onlineCount > 0} light={onlineOnly} />
            {onlineCount} online
          </button>
        </div>
        <button onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-[#2445b5]"><Plus size={16} /> Add Account</button>
      </div>

      {error && !createOpen && !resetTarget && !editTarget && !deleteTarget ? <p role="alert" className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</p> : null}

      <Card className="table-card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 sm:py-4 sm:px-5"><h2 className="text-sm font-bold text-slate-800">Account List</h2><p className="mt-1 hidden text-[11px] text-slate-500 sm:block">Only administrators can manage account access.</p></div>

        {shownAccounts.length === 0 ? <p className="px-5 py-8 text-center text-xs text-slate-400">{onlineOnly ? "No one is online right now." : "No accounts to show."}</p> : null}

        <ul className="divide-y divide-slate-100 md:hidden">
          {shownAccounts.map((account) => {
            const open = expandedId === account.id;
            const isAdminRole = account.role === "administrator";
            const stateLabel = !account.isActive ? "Inactive" : account.isLocked ? "Locked" : "Active";
            return (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? "" : account.id)}
                  aria-expanded={open}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition active:bg-slate-100 ${open ? "bg-slate-50/80" : ""}`}
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-black uppercase ${isAdminRole ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>{account.username.slice(0, 2)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-bold text-slate-800">@{account.username}</span>
                      {account.id === currentUserId ? <span className="shrink-0 rounded bg-blue-50 px-1.5 py-px text-[9px] font-bold text-blue-700">You</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{roleLabel(account.role)} · {divisionScopeLabel(account)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <PresenceLine account={account} compact />
                    {stateLabel !== "Active" ? <StatusBadge tone="amber">{stateLabel}</StatusBadge> : null}
                  </span>
                  <ChevronDown size={14} aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? (
                  <div className="space-y-2.5 bg-slate-50/80 px-3.5 pb-3 pt-1">
                    <dl className="grid grid-cols-3 gap-2 text-[11px]">
                      <div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</dt><dd className="mt-0.5 font-semibold text-slate-700">{stateLabel}</dd></div>
                      <div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Last seen</dt><dd className="mt-0.5 font-semibold text-slate-700">{account.presence === "online" ? "Now" : account.lastSeenLabel}</dd></div>
                      <div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Created</dt><dd className="mt-0.5 font-semibold text-slate-700">{account.createdAt}</dd></div>
                    </dl>
                    {account.isLocked ? <p className="text-[10px] font-semibold text-amber-600">Locked after failed login attempts; it unlocks by itself or when the password is reset.</p> : null}
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => openEdit(account)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-[11px] font-semibold text-white transition active:scale-95"><Pencil size={12} /> Edit</button>
                      <button type="button" onClick={() => openReset(account)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-amber-500 text-[11px] font-semibold text-white transition active:scale-95"><KeyRound size={12} /> Reset</button>
                      <button type="button" disabled={saving || account.id === currentUserId} onClick={() => openDelete(account)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-rose-600 text-[11px] font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-slate-50/90 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">Username</th><th className="px-4 py-3.5">Role</th><th className="px-4 py-3.5">Scope</th><th className="px-4 py-3.5">Created</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {shownAccounts.map((account) => (
                <tr key={account.id} className="text-xs">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${account.role === "administrator" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}><UserCog size={16} /></span><div><p className="font-semibold text-slate-800">@{account.username} {account.id === currentUserId ? <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700">You</span> : null}</p></div></div></td>
                  <td className="px-4 py-4"><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${account.role === "administrator" ? "bg-blue-50 text-blue-700" : account.role === "service_agent" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>{roleLabel(account.role)}</span></td>
                  <td className="px-4 py-4 text-[11px] text-slate-600">{divisionScopeLabel(account)}</td>
                  <td className="px-4 py-4 text-[11px] text-slate-500">{account.createdAt}</td>
                  <td className="px-4 py-4"><div className="flex flex-wrap items-center gap-1.5"><StatusBadge tone={!account.isActive || account.isLocked ? "amber" : "green"}>{!account.isActive ? "Inactive" : account.isLocked ? "Locked" : "Active"}</StatusBadge><PresenceLine account={account} /></div></td>
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
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="create-account-title" className="text-sm font-bold text-slate-900">Add User</h2><p className="mt-1 text-[11px] text-slate-500">Admin and approval roles can be global or belong to a division; Requesters and Staff always follow their assigned division or unit.</p></div><button onClick={() => setCreateOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button></div>
            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Username<input name="username" required minLength={2} maxLength={80} autoCapitalize="none" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" placeholder="user.name" /></label><label className="block text-[11px] font-semibold text-slate-600">Role<select name="role" value={createRole} onChange={(event) => setCreateRole(event.target.value as AccountRecord["role"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
              <label className="block text-[11px] font-semibold text-slate-600">Division / Unit<span className="mt-1 block text-[9px] font-normal text-slate-400">{divisionHint(createRole)}</span><select key={createRole} name="divisionId" defaultValue="" disabled={!accountRoleAllowsDivision(createRole)} required={accountRoleRequiresDivision(createRole)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><option value="">{accountRoleRequiresDivision(createRole) ? "Select division / unit" : "Global / all divisions"}</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label>
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
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">Username <b className="font-mono text-slate-700">@{editTarget.username}</b> cannot be changed.</p>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Role<select name="role" value={editRole} onChange={(event) => setEditRole(event.target.value as AccountRecord["role"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="block text-[11px] font-semibold text-slate-600">Status<select name="isActive" defaultValue={editTarget.isActive ? "true" : "false"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"><option value="true">Active</option><option value="false">Inactive</option></select></label></div>
              <label className="block text-[11px] font-semibold text-slate-600">Division / Unit<span className="mt-1 block text-[9px] font-normal text-slate-400">{divisionHint(editRole)}</span><select key={`${editTarget.id}-${editRole}`} name="divisionId" defaultValue={accountRoleAllowsDivision(editRole) ? editTarget.divisionId ?? "" : ""} disabled={!accountRoleAllowsDivision(editRole)} required={accountRoleRequiresDivision(editRole)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><option value="">{accountRoleRequiresDivision(editRole) ? "Select division / unit" : "Global / all divisions"}</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label>
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

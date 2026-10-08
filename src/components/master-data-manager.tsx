"use client";

import { Building2, LoaderCircle, MapPin, Plus, Search, SlidersHorizontal, Tag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createMasterItemAction,
  deleteMasterItemAction,
  updateDivisionRequestSettingsAction,
  type MasterDataType,
} from "@/app/master-data/actions";
import type { MasterDataRecords, MasterDivisionRecord, MasterItemRecord } from "@/data/master-data";
import { serviceRequestTemplates } from "@/features/service-requests/template-registry";
import { serviceInboxProfiles } from "@/features/service-inbox/profile-registry";
import { isGaDivisionSlug } from "@/lib/request-destination";

interface DeleteTarget extends MasterItemRecord {
  type: MasterDataType;
}

const tabConfig: Array<{ type: MasterDataType; label: string; singular: string; hint: string; icon: typeof Building2 }> = [
  { type: "division", label: "Divisions", singular: "division", hint: "Used by service request and Backup User forms.", icon: Building2 },
  { type: "location", label: "Locations", singular: "location", hint: "Used as work locations in service requests.", icon: MapPin },
  { type: "category", label: "Categories", singular: "category", hint: "Used to classify service requests.", icon: Tag },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase();
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className={`inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
      {label}
    </label>
  );
}

export function MasterDataManager({ initialData }: { initialData: MasterDataRecords }) {
  const router = useRouter();
  const [tab, setTab] = useState<MasterDataType>("division");
  const [query, setQuery] = useState("");
  const [openSettings, setOpenSettings] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const lists: Record<MasterDataType, MasterItemRecord[]> = {
    division: initialData.divisions,
    location: initialData.locations,
    category: initialData.categories,
  };
  const active = tabConfig.find((item) => item.type === tab) ?? tabConfig[0];
  const needle = query.trim().toLocaleLowerCase("id-ID");
  const visible = useMemo(
    () => lists[tab].filter((record) => !needle || record.name.toLocaleLowerCase("id-ID").includes(needle)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialData, tab, needle],
  );
  const adding = pendingAction === `add-${tab}`;
  const gaUnits = initialData.divisions.filter((division) => division.isGaUnit).length;
  const acceptingRequests = initialData.divisions.filter((division) => isGaDivisionSlug(division.slug) && division.isServiceTarget).length;

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "");
    setPendingAction(`add-${tab}`);
    setError("");
    const result = await createMasterItemAction(tab, name);
    setPendingAction("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPendingAction(`delete-${deleteTarget.id}`);
    setError("");
    const result = await deleteMasterItemAction(deleteTarget.type, deleteTarget.id);
    setPendingAction("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  async function saveDivisionRequestSettings(
    division: MasterDivisionRecord,
    isServiceTarget: boolean,
    requestFormKey: string | null,
    inboxProfileKey: string,
    isGaUnit = division.isGaUnit,
  ) {
    setPendingAction(`request-settings-${division.id}`);
    setError("");
    const result = await updateDivisionRequestSettingsAction(
      division.id,
      isServiceTarget,
      requestFormKey,
      inboxProfileKey,
      isGaUnit,
    );
    setPendingAction("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function requestDelete(record: MasterItemRecord) {
    setError("");
    setDeleteTarget({ ...record, type: tab });
  }

  function divisionRow(division: MasterDivisionRecord) {
    const saving = pendingAction === `request-settings-${division.id}`;
    const isGa = isGaDivisionSlug(division.slug);
    const open = openSettings === division.id;
    const profileLabel = serviceInboxProfiles.find((profile) => profile.key === division.inboxProfileKey)?.label ?? division.inboxProfileKey;
    return (
      <li key={division.id} className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-[10px] font-black text-indigo-700">{initials(division.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800" title={division.name}>{division.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <span className="font-mono text-[9px] text-slate-400">{division.slug}</span>
              {division.isGaUnit ? <span className="rounded bg-emerald-50 px-1.5 py-px text-[9px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">GA unit</span> : null}
              {isGa ? (division.isServiceTarget
                ? <span className="rounded bg-indigo-50 px-1.5 py-px text-[9px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">Accepts requests</span>
                : <span className="rounded bg-amber-50 px-1.5 py-px text-[9px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/25">Closed to requests</span>) : null}
              <span className="rounded bg-slate-100 px-1.5 py-px text-[9px] font-medium text-slate-500">{profileLabel}</span>
            </div>
          </div>
          {saving ? <LoaderCircle size={15} className="shrink-0 animate-spin text-slate-400" aria-label="Saving" /> : null}
          <button
            type="button"
            onClick={() => setOpenSettings(open ? "" : division.id)}
            aria-expanded={open}
            aria-label={`Settings for ${division.name}`}
            title="Settings"
            className={`grid size-8 shrink-0 place-items-center rounded-lg border transition active:scale-90 ${open ? "border-indigo-300 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            <SlidersHorizontal size={14} />
          </button>
          <button type="button" onClick={() => requestDelete(division)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 active:scale-90" aria-label={`Delete ${division.name}`} title="Delete"><Trash2 size={14} /></button>
        </div>

        {open ? (
          <div className="mt-2 grid gap-x-4 gap-y-2.5 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
            <Switch
              checked={division.isGaUnit}
              disabled={saving}
              label="Can receive GA assignments"
              onChange={(value) => void saveDivisionRequestSettings(division, division.isServiceTarget, division.requestFormKey, division.inboxProfileKey, value)}
            />
            {isGa ? (
              <Switch
                checked={division.isServiceTarget}
                disabled={saving}
                label="Accept requests to GA"
                onChange={(value) => void saveDivisionRequestSettings(division, value, value ? division.requestFormKey : null, division.inboxProfileKey)}
              />
            ) : <span />}
            <label className="block text-[10px] font-semibold text-slate-500">Inbox profile
              <select
                value={division.inboxProfileKey}
                disabled={saving}
                onChange={(event) => void saveDivisionRequestSettings(division, division.isServiceTarget, division.requestFormKey, event.target.value)}
                className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-normal text-slate-700 outline-none focus:border-indigo-400"
                aria-label={`Inbox profile for ${division.name}`}
              >
                {serviceInboxProfiles.map((profile) => <option key={profile.key} value={profile.key}>{profile.label}</option>)}
              </select>
            </label>
            {isGa && division.isServiceTarget ? (
              <label className="block text-[10px] font-semibold text-slate-500">Request form template
                <select
                  value={division.requestFormKey ?? ""}
                  disabled={saving}
                  onChange={(event) => void saveDivisionRequestSettings(division, true, event.target.value || null, division.inboxProfileKey)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-normal text-slate-700 outline-none focus:border-indigo-400"
                  aria-label={`Form template for ${division.name}`}
                >
                  <option value="">General form</option>
                  {serviceRequestTemplates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <>
      {error && !deleteTarget ? <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p> : null}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{gaUnits} GA units</span>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">{acceptingRequests ? "GA accepts requests" : "GA closed to requests"}</span>
        <span className="text-slate-400">Deleting only removes an option from new forms; existing records stay unchanged.</span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Master data type" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {tabConfig.map((item) => {
              const selected = tab === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => { setTab(item.type); setQuery(""); setOpenSettings(""); setError(""); }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <item.icon size={13} />
                  {item.label}
                  <span className={`min-w-5 rounded-full px-1.5 text-center text-[9px] tabular-nums ${selected ? "bg-slate-900 text-white" : "bg-slate-300 text-slate-700"}`}>{lists[item.type].length}</span>
                </button>
              );
            })}
          </div>
          <form onSubmit={addItem} className="flex min-w-0 flex-1 gap-2 lg:max-w-md">
            <input name="name" required maxLength={120} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder={`New ${active.singular} name`} />
            <button disabled={adding} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white transition hover:bg-indigo-700 active:scale-95 disabled:bg-slate-300">
              {adding ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}{adding ? "Adding" : "Add"}
            </button>
          </form>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search {active.label.toLowerCase()}</span>
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active.label.toLowerCase()}`} className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-indigo-400" />
          </label>
          <p className="hidden shrink-0 text-[10px] text-slate-400 sm:block">{active.hint}</p>
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 tabular-nums">{visible.length}{needle ? ` / ${lists[tab].length}` : ""}</span>
        </div>

        {visible.length ? (
          tab === "division" ? (
            <ul className="divide-y divide-slate-100">{(visible as MasterDivisionRecord[]).map(divisionRow)}</ul>
          ) : (
            <ul className="grid gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((record) => (
                <li key={record.id} className="group flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 transition hover:border-slate-300 hover:shadow-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500"><active.icon size={12} /></span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700" title={record.name}>{record.name}</span>
                  <button type="button" onClick={() => requestDelete(record)} className="grid size-7 shrink-0 place-items-center rounded-md text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:text-rose-600 group-hover:text-slate-400 active:scale-90" aria-label={`Delete ${record.name}`} title="Delete"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="px-5 py-10 text-center">
            <active.icon className="mx-auto text-slate-300" size={26} />
            <p className="mt-2.5 text-sm font-bold text-slate-700">{needle ? "No matching items" : `No ${active.label.toLowerCase()} yet`}</p>
            <p className="mt-1 text-xs text-slate-400">{needle ? "Try another name or clear the search." : `Add the first ${active.singular} above.`}</p>
          </div>
        )}
      </section>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-master-title">
          <section className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h2 id="delete-master-title" className="text-sm font-bold text-slate-900">Delete {deleteTarget.type}?</h2><p className="mt-2 text-xs leading-5 text-slate-500"><b>{deleteTarget.name}</b> will be removed from new form options. Existing records remain unchanged.</p></div><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg p-1.5 text-slate-400" aria-label="Close"><X size={17} /></button></div>
            {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={confirmDelete} disabled={pendingAction === `delete-${deleteTarget.id}`} className="h-10 rounded-xl bg-rose-600 text-xs font-semibold text-white disabled:bg-slate-300">{pendingAction === `delete-${deleteTarget.id}` ? "Deleting..." : "Delete"}</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

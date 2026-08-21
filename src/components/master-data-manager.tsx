"use client";

import { Building2, MapPin, Plus, Tag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createMasterItemAction,
  deleteMasterItemAction,
  updateDivisionRequestSettingsAction,
  type MasterDataType,
} from "@/app/master-data/actions";
import { Card } from "@/components/ui";
import type { MasterDataRecords, MasterDivisionRecord, MasterItemRecord } from "@/data/master-data";
import { serviceRequestTemplates } from "@/features/service-requests/template-registry";

interface DeleteTarget extends MasterItemRecord {
  type: MasterDataType;
}

export function MasterDataManager({ initialData }: { initialData: MasterDataRecords }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  async function addItem(type: MasterDataType, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "");
    setPendingAction(`add-${type}`);
    setError("");
    const result = await createMasterItemAction(type, name);
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
  ) {
    setPendingAction(`request-settings-${division.id}`);
    setError("");
    const result = await updateDivisionRequestSettingsAction(
      division.id,
      isServiceTarget,
      requestFormKey,
    );
    setPendingAction("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  function masterCard(
    type: MasterDataType,
    title: string,
    description: string,
    records: MasterItemRecord[],
  ) {
    const Icon = type === "division" ? Building2 : type === "location" ? MapPin : Tag;
    const adding = pendingAction === `add-${type}`;
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#3157d5]"><Icon size={20} /></span>
          <div className="min-w-0"><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="mt-1 text-[10px] leading-4 text-slate-500">{description}</p></div>
        </div>
        <form onSubmit={(event) => addItem(type, event)} className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row">
          <input name="name" required maxLength={120} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder={`Enter ${type} name`} />
          <button disabled={adding} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white disabled:bg-slate-300"><Plus size={15} />{adding ? "Adding..." : "Add"}</button>
        </form>
        <div className="divide-y divide-slate-100">
          {records.map((record, index) => (
            <div key={record.id} className="flex min-h-14 items-center gap-3 px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-700">{record.name}</span>
                {type === "division" ? (() => {
                  const division = record as MasterDivisionRecord;
                  const savingSettings = pendingAction === `request-settings-${division.id}`;
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={division.isServiceTarget}
                          disabled={savingSettings}
                          onChange={(event) => void saveDivisionRequestSettings(
                            division,
                            event.target.checked,
                            event.target.checked ? division.requestFormKey : null,
                          )}
                          className="size-3.5 rounded border-slate-300 text-[#3157d5]"
                        />
                        Tujuan layanan
                      </label>
                      {division.isServiceTarget ? (
                        <select
                          value={division.requestFormKey ?? ""}
                          disabled={savingSettings}
                          onChange={(event) => void saveDivisionRequestSettings(
                            division,
                            true,
                            event.target.value || null,
                          )}
                          className="h-7 max-w-44 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-slate-600 outline-none focus:border-blue-400"
                          aria-label={`Template form untuk ${division.name}`}
                        >
                          <option value="">Form umum</option>
                          {serviceRequestTemplates.map((template) => (
                            <option key={template.key} value={template.key}>
                              {template.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  );
                })() : null}
              </div>
              <button type="button" onClick={() => { setError(""); setDeleteTarget({ ...record, type }); }} className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600" aria-label={`Delete ${record.name}`} title="Delete"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p> : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {masterCard("division", "Divisions", "Used by service request and Backup User forms.", initialData.divisions)}
        {masterCard("location", "Locations", "Used as work locations in service requests.", initialData.locations)}
        {masterCard("category", "Categories", "Used to classify service requests.", initialData.categories)}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-master-title">
          <section className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h2 id="delete-master-title" className="text-sm font-bold text-slate-900">Delete {deleteTarget.type}?</h2><p className="mt-2 text-xs leading-5 text-slate-500"><b>{deleteTarget.name}</b> will be removed from new form options. Existing records remain unchanged.</p></div><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg p-1.5 text-slate-400" aria-label="Close"><X size={17} /></button></div>
            {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={confirmDelete} disabled={pendingAction === `delete-${deleteTarget.id}`} className="h-10 rounded-xl bg-rose-600 text-xs font-semibold text-white disabled:bg-slate-300">{pendingAction ? "Deleting..." : "Delete"}</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Image from "next/image";
import { CalendarDays, Camera, CheckCircle2, Eye, Filter, LoaderCircle, MapPin, Pencil, Plus, QrCode, Search, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { deleteIssueAction, saveIssueAction } from "@/app/troubleshooting/actions";
import { ApprovalQrModal } from "@/components/approval-qr-modal";
import { Card, StatusBadge } from "@/components/ui";
import type { TicketRecord } from "@/data/types";
import { jakartaDateInput } from "@/lib/jakarta-date";
import { compressWorkPhoto, formatPhotoSize } from "@/lib/work-photo";

type FormMode = "create" | "edit" | null;

function completionLabel(days: number | null) {
  if (days === null) return "Not completed";
  if (days === 0) return "Same day";
  return `${days} days`;
}

function formatCompactDate(value: string) {
  if (!value) return "dd/mm/yyyy";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function canRequestApproval(ticket: TicketRecord) {
  return ticket.status === "Waiting for Client Approval" && ticket.hasWorkPhoto;
}

function approvalActionTitle(ticket: TicketRecord) {
  if (ticket.status !== "Waiting for Client Approval") {
    return "Set status to Waiting for Client Approval";
  }
  return ticket.hasWorkPhoto ? "QR Signature" : "Add a work photo first";
}

function optionsWithCurrent(options: string[], current?: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

export function TicketList({ initialRecords, canManage, divisionOptions, locationOptions, categoryOptions }: { initialRecords: TicketRecord[]; canManage: boolean; divisionOptions: string[]; locationOptions: string[]; categoryOptions: string[] }) {
  const router = useRouter();
  const defaultLocation = locationOptions.includes("HO")
    ? "HO"
    : locationOptions[0];
  const defaultCategory = categoryOptions.includes("Software")
    ? "Software"
    : categoryOptions[0];
  const ticketRecords = initialRecords;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [location, setLocation] = useState("All Locations");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [mode, setMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<TicketRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<TicketRecord | null>(null);
  const [approvalRecord, setApprovalRecord] = useState<TicketRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TicketRecord | null>(null);
  const [requestDate, setRequestDate] = useState(jakartaDateInput);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const filterStartDateInputRef = useRef<HTMLInputElement>(null);
  const filterEndDateInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const filtered = useMemo(() => ticketRecords.filter((ticket) => {
    const matchQuery = `${ticket.id} ${ticket.title} ${ticket.requester} ${ticket.division} ${ticket.category} ${ticket.location}`.toLowerCase().includes(deferredQuery);
    const matchDate =
      (!filterStartDate || ticket.reportedDate >= filterStartDate) &&
      (!filterEndDate || ticket.reportedDate <= filterEndDate);
    return matchQuery && matchDate && (status === "All Statuses" || ticket.status === status) && (location === "All Locations" || ticket.location === location);
  }), [ticketRecords, deferredQuery, status, location, filterStartDate, filterEndDate]);

  function openForm(nextMode: Exclude<FormMode, null>, record: TicketRecord | null = null) {
    setSelected(record);
    setRequestDate(record?.reportedDate ?? jakartaDateInput());
    setPhotoFile(null);
    setPhotoPreview(record?.workPhotoUrl ?? "");
    setPhotoRemoved(false);
    setCompressingPhoto(false);
    setFormError("");
    setMode(nextMode);
  }

  async function selectWorkPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCompressingPhoto(true);
    setFormError("");
    try {
      const compressed = await compressWorkPhoto(file);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      setPhotoRemoved(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The photo could not be processed.",
      );
    } finally {
      setCompressingPhoto(false);
    }
  }

  function removeWorkPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoRemoved(Boolean(selected?.hasWorkPhoto));
  }

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else { input.focus(); input.click(); }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("reportedDate", requestDate);
    if (selected) data.set("id", selected.id);
    const hasWorkPhoto = Boolean(photoFile) || (!photoRemoved && selected?.hasWorkPhoto);
    if (data.get("status") === "Waiting for Client Approval" && !hasWorkPhoto) {
      setFormError("Add a work photo before requesting client approval.");
      return;
    }
    data.set("photoIntent", photoFile ? "replace" : photoRemoved ? "remove" : "keep");
    if (photoFile) data.set("workPhoto", photoFile);
    setSaving(true);
    setFormError("");
    const result = await saveIssueAction(data);
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
    const result = await deleteIssueAction(pendingDelete.id);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label className="relative min-w-0 max-w-md flex-1 sm:min-w-64"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs outline-none" placeholder="Search records or requester..." /></label>
          <label className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><select value={location} onChange={(event) => setLocation(event.target.value)} className="h-10 w-full min-w-40 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-600 outline-none sm:w-auto"><option>All Locations</option><option>HO</option><option>Factory</option></select></label>
          <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full min-w-44 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-600 outline-none sm:w-auto"><option>All Statuses</option><option>New</option><option>In Progress</option><option>Waiting for Client Approval</option><option>Completed</option></select></label>
          <div className="flex min-w-0 gap-2 sm:min-w-[21rem]">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <div className="relative h-10 min-w-0">
                <button type="button" onClick={() => openDatePicker(filterStartDateInputRef.current)} aria-label="Select start request date" className="flex h-full w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left outline-none">
                  <CalendarDays className="shrink-0 text-slate-400" size={15} />
                  <span className="min-w-0"><span className="block text-[8px] font-bold uppercase tracking-wide text-slate-400">From Date</span><span className={`block truncate text-[10px] ${filterStartDate ? "font-semibold text-slate-600" : "text-slate-400"}`}>{formatCompactDate(filterStartDate)}</span></span>
                </button>
                <input ref={filterStartDateInputRef} type="date" value={filterStartDate} max={filterEndDate || undefined} onChange={(event) => setFilterStartDate(event.target.value)} className="absolute bottom-0 left-0 h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" />
              </div>
              <div className="relative h-10 min-w-0">
                <button type="button" onClick={() => openDatePicker(filterEndDateInputRef.current)} aria-label="Select end request date" className="flex h-full w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left outline-none">
                  <CalendarDays className="shrink-0 text-slate-400" size={15} />
                  <span className="min-w-0"><span className="block text-[8px] font-bold uppercase tracking-wide text-slate-400">To Date</span><span className={`block truncate text-[10px] ${filterEndDate ? "font-semibold text-slate-600" : "text-slate-400"}`}>{formatCompactDate(filterEndDate)}</span></span>
                </button>
                <input ref={filterEndDateInputRef} type="date" value={filterEndDate} min={filterStartDate || undefined} onChange={(event) => setFilterEndDate(event.target.value)} className="absolute bottom-0 left-0 h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" />
              </div>
            </div>
            {filterStartDate || filterEndDate ? <button type="button" onClick={() => { setFilterStartDate(""); setFilterEndDate(""); }} aria-label="Clear date range" title="Clear date range" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={14} /></button> : null}
          </div>
        </div>
        {canManage ? <button onClick={() => openForm("create")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-[#2445b5]"><Plus size={16} /> Add Issue</button> : null}
      </div>

      <Card className="table-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5"><div><p className="text-xs font-bold text-slate-800">Troubleshooting Records</p><p className="mt-1 text-[10px] text-slate-400">Internal IT records for the Head Office and Factory</p></div><span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{filtered.length} records</span></div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filtered.map((ticket) => (
            <article key={ticket.id} className="p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-bold leading-5 text-slate-800">{ticket.title}</h3><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id} · {ticket.category}</p></div><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : ticket.status === "New" ? "gray" : "amber"}>{ticket.status}</StatusBadge></div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-3">
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Requester</p><p className="mt-1 text-[11px] font-medium text-slate-700">{ticket.requester}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 text-[11px] font-medium text-slate-700">{ticket.location}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Division</p><p className="mt-1 text-[11px] font-medium text-slate-700">{ticket.division}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Request Date</p><p className="mt-1 text-[11px] font-medium text-slate-700">{ticket.reportedAt}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3"><StatusBadge tone={ticket.priority === "Critical" ? "red" : ticket.priority === "High" ? "amber" : "gray"}>{ticket.priority}</StatusBadge><span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${ticket.hasWorkPhoto ? "text-emerald-600" : "text-slate-400"}`}>{ticket.hasWorkPhoto ? <CheckCircle2 size={12} /> : <Camera size={12} />}{ticket.hasWorkPhoto ? "Photo available" : "No photo"}</span><span className={`ml-auto text-[10px] font-semibold ${ticket.completedDays === null ? "text-slate-400" : "text-emerald-600"}`}>{completionLabel(ticket.completedDays)}</span></div>
              <div className={`mt-4 gap-2 border-t border-slate-100 pt-4 ${canManage ? "grid grid-cols-2" : "flex"}`}><button onClick={() => setDetailRecord(ticket)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#3157d5] px-2 text-[10px] font-semibold text-white" aria-label={`View details ${ticket.id}`}><Eye size={13} /> Detail</button>{canManage ? <><button disabled={!canRequestApproval(ticket)} onClick={() => setApprovalRecord(ticket)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400" aria-label={`Request client signature ${ticket.id}`} title={approvalActionTitle(ticket)}><QrCode size={13} /> QR Signature</button><button onClick={() => openForm("edit", ticket)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-2 text-[10px] font-semibold text-white" aria-label={`Edit ${ticket.id}`}><Pencil size={13} /> Edit</button><button onClick={() => setPendingDelete(ticket)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2 text-[10px] font-semibold text-white" aria-label={`Delete ${ticket.id}`}><Trash2 size={13} /> Delete</button></> : null}</div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1360px] text-left">
            <thead className="bg-slate-50/90 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="w-12 px-4 py-3.5 text-center">No.</th><th className="px-4 py-3.5">Issue</th><th className="px-4 py-3.5">Location</th><th className="px-4 py-3.5">Requester</th><th className="px-4 py-3.5">Division</th><th className="px-4 py-3.5">Date</th><th className="px-4 py-3.5">Priority</th><th className="px-4 py-3.5">Photo</th><th className="px-4 py-3.5">Completion Time</th><th className="px-4 py-3.5">Status</th><th className="w-44 px-5 py-3.5 text-center">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ticket, index) => (
                <tr key={ticket.id} className="text-xs">
                  <td className="px-4 py-4 text-center text-[11px] font-semibold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-4"><div><p className="font-semibold text-slate-800">{ticket.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id} · {ticket.category}</p></div></td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold ${ticket.location === "HO" ? "bg-indigo-50 text-indigo-700" : "bg-cyan-50 text-cyan-700"}`}><MapPin size={11} />{ticket.location}</span></td>
                  <td className="px-4 py-4 text-slate-600">{ticket.requester}</td><td className="px-4 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{ticket.division}</span></td><td className="px-4 py-4 text-[11px] text-slate-500">{ticket.reportedAt}</td>
                  <td className="px-4 py-4"><StatusBadge tone={ticket.priority === "Critical" ? "red" : ticket.priority === "High" ? "amber" : "gray"}>{ticket.priority}</StatusBadge></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${ticket.hasWorkPhoto ? "text-emerald-600" : "text-slate-400"}`}>{ticket.hasWorkPhoto ? <CheckCircle2 size={13} /> : <Camera size={13} />}{ticket.hasWorkPhoto ? "Available" : "Missing"}</span></td><td className="px-4 py-4"><span className={`text-[11px] font-semibold ${ticket.completedDays === null ? "text-slate-400" : "text-emerald-600"}`}>{completionLabel(ticket.completedDays)}</span></td><td className="px-4 py-4"><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : ticket.status === "New" ? "gray" : "amber"}>{ticket.status}</StatusBadge></td>
                  <td className="px-5 py-4"><div className="flex justify-center gap-2"><button onClick={() => setDetailRecord(ticket)} className="grid size-8 place-items-center rounded-lg bg-[#3157d5] text-white shadow-sm transition hover:bg-[#2445b5]" aria-label={`View details ${ticket.id}`} title="Detail"><Eye size={14} /></button>{canManage ? <><button disabled={!canRequestApproval(ticket)} onClick={() => setApprovalRecord(ticket)} className="grid size-8 place-items-center rounded-lg bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400" aria-label={`Request client signature ${ticket.id}`} title={approvalActionTitle(ticket)}><QrCode size={14} /></button><button onClick={() => openForm("edit", ticket)} className="grid size-8 place-items-center rounded-lg bg-amber-500 text-white shadow-sm transition hover:bg-amber-600" aria-label={`Edit ${ticket.id}`} title="Edit"><Pencil size={14} /></button><button onClick={() => setPendingDelete(ticket)} className="grid size-8 place-items-center rounded-lg bg-rose-600 text-white shadow-sm transition hover:bg-rose-700" aria-label={`Delete ${ticket.id}`} title="Delete"><Trash2 size={14} /></button></> : null}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? <div className="px-5 py-14 text-center text-xs text-slate-500">No records match your search.</div> : null}
        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">Showing {filtered.length} of {ticketRecords.length} records</div>
      </Card>

      {canManage && approvalRecord ? <ApprovalQrModal record={approvalRecord} onClose={() => setApprovalRecord(null)} /> : null}

      {detailRecord ? (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="issue-document-title">
          <div className="mx-auto my-4 w-full max-w-3xl rounded-sm bg-white shadow-2xl sm:my-8">
            <div className="flex justify-end border-b border-slate-200 px-5 py-3">
              <button onClick={() => setDetailRecord(null)} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Close issue detail"><X size={18} /></button>
            </div>
            <article className="px-6 py-8 text-slate-800 sm:px-12 sm:py-10">
              <header className="border-b-2 border-slate-900 pb-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Internal IT Department</p>
                <h2 id="issue-document-title" className="mt-2 text-xl font-bold uppercase tracking-wide text-slate-950">Troubleshooting Issue Report</h2>
                <p className="mt-2 font-mono text-xs text-slate-500">Document No. {detailRecord.id}</p>
              </header>

              <section className="mt-8" aria-labelledby="report-information-title">
                <h3 id="report-information-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Report Information</h3>
                <dl className="mt-4 grid gap-x-10 gap-y-4 text-xs sm:grid-cols-2">
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Request Date</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.reportedAt}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Location</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.location}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Requester</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.requester}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Division</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.division}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Category</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.category}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.priority}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.status}</dd></div>
                  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Completion Time</dt><dd className="mt-1 font-medium text-slate-800">{completionLabel(detailRecord.completedDays)}</dd></div>
                </dl>
              </section>

              <section className="mt-8" aria-labelledby="issue-detail-title">
                <h3 id="issue-detail-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Issue Detail</h3>
                <h4 className="mt-4 text-base font-bold leading-6 text-slate-950">{detailRecord.title}</h4>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{detailRecord.description}</p>
              </section>

              <section className="mt-8" aria-labelledby="work-photo-title">
                <h3 id="work-photo-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Work Photo</h3>
                {detailRecord.workPhotoUrl ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <Image src={detailRecord.workPhotoUrl} width={1200} height={900} unoptimized alt={`Work evidence for ${detailRecord.id}`} className="max-h-[520px] w-full rounded-md object-contain" />
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">No work photo has been added.</p>
                )}
              </section>

              <section className="mt-8" aria-labelledby="client-signature-title">
                <h3 id="client-signature-title" className="border-b border-slate-300 pb-2 text-xs font-bold uppercase tracking-wider text-slate-900">Client Signature</h3>
                {detailRecord.clientApproval ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px] sm:items-end">
                    <dl className="grid gap-4 text-xs">
                      <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Approved By</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.clientApproval.clientName}</dd></div>
                      <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Approved At</dt><dd className="mt-1 font-medium text-slate-800">{detailRecord.clientApproval.approvedAt}</dd></div>
                    </dl>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <Image src={detailRecord.clientApproval.signatureUrl} width={440} height={220} unoptimized alt={`Client signature by ${detailRecord.clientApproval.clientName}`} className="h-28 w-full object-contain" />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">Client approval and signature have not been submitted.</p>
                )}
              </section>

              <footer className="mt-12 border-t border-slate-300 pt-4 text-[10px] leading-5 text-slate-400">
                This document is an internal troubleshooting record generated from IT Activity Log.
              </footer>
            </article>
          </div>
        </div>
      ) : null}

      {mode ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ticket-title">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="ticket-title" className="text-sm font-bold text-slate-900">{mode === "create" ? "Add New Issue" : "Edit Issue Record"}</h2><p className="mt-1 text-[11px] text-slate-500">Recorded on behalf of the IT team for activity reporting.</p></div><button onClick={() => setMode(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close form"><X size={18} /></button></div>
            <form key={`${mode}-${selected?.id ?? "new"}`} className="space-y-4 p-5" onSubmit={handleSubmit}>
              <label className="block text-[11px] font-semibold text-slate-600">Issue Title<input name="title" required defaultValue={selected?.title} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Location<select name="location" required defaultValue={selected?.location ?? defaultLocation} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none">{optionsWithCurrent(locationOptions, selected?.location).map((option) => <option key={option} value={option}>{option}</option>)}</select></label><div className="block text-[11px] font-semibold text-slate-600"><span id="request-date-label">Request Date</span><div className="relative mt-1.5"><button type="button" onClick={() => openDatePicker(dateInputRef.current)} aria-labelledby="request-date-label" className="flex h-10 w-full items-center rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-normal text-slate-700 outline-none"><span className="flex-1">{formatCompactDate(requestDate)}</span><CalendarDays size={15} className="text-slate-400" /></button><input ref={dateInputRef} type="date" value={requestDate} onChange={(event) => setRequestDate(event.target.value)} className="absolute bottom-0 left-0 h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" /></div></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Requester Name<input name="requester" required defaultValue={selected?.requester} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" /></label><label className="block text-[11px] font-semibold text-slate-600">Division<select name="division" required defaultValue={selected?.division ?? divisionOptions[0]} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{optionsWithCurrent(divisionOptions, selected?.division).map((option) => <option key={option} value={option}>{option}</option>)}</select></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Category<select name="category" required defaultValue={selected?.category ?? defaultCategory} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{optionsWithCurrent(categoryOptions, selected?.category).map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="block text-[11px] font-semibold text-slate-600">Priority<select name="priority" defaultValue={selected?.priority ?? "Low"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Status<select name="status" defaultValue={selected?.status ?? "New"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"><option>New</option><option>In Progress</option><option>Waiting for Client Approval</option><option>Reopened</option>{selected?.status === "Completed" ? <option>Completed</option> : null}</select></label><div><p className="text-[11px] font-semibold text-slate-600">Completion Time</p><p className="mt-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] leading-5 text-slate-500">Calculated automatically after client approval.</p></div></div>
              <label className="block text-[11px] font-semibold text-slate-600">Issue Description<textarea name="description" required rows={4} defaultValue={selected?.description} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 p-3 text-xs outline-none" /></label>
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby="work-photo-field-title">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 id="work-photo-field-title" className="text-[11px] font-semibold text-slate-700">Work Photo</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">Take a photo or select one from the gallery. It is converted to JPEG and compressed below 2 MB.</p></div>
                  {photoPreview ? <button type="button" onClick={removeWorkPhoto} disabled={compressingPhoto} className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 disabled:opacity-50">Remove</button> : null}
                </div>
                {photoPreview ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                    <Image src={photoPreview} width={720} height={540} unoptimized alt="Selected work photo preview" className="h-48 w-full rounded-lg object-contain sm:h-56" />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1"><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600"><CheckCircle2 size={13} /> Ready to save</span>{photoFile ? <span className="text-[10px] text-slate-400">{formatPhotoSize(photoFile.size)}</span> : <span className="text-[10px] text-slate-400">Stored photo</span>}</div>
                  </div>
                ) : null}
                <div className={`grid grid-cols-[minmax(0,1fr)_3rem] gap-2 ${photoPreview ? "mt-2" : "mt-3"}`}>
                  <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={compressingPhoto} className={`flex w-full items-center justify-center rounded-xl border border-blue-300 bg-white px-4 text-center font-semibold text-blue-700 disabled:cursor-wait disabled:text-slate-400 ${photoPreview ? "h-10 gap-2 text-[10px]" : "min-h-28 flex-col text-[11px]"}`}>
                    {compressingPhoto ? <LoaderCircle size={photoPreview ? 14 : 22} className="animate-spin" /> : <Camera size={photoPreview ? 14 : 22} />}
                    <span className={photoPreview ? "" : "mt-2"}>{compressingPhoto ? "Compressing photo..." : photoPreview ? "Take new photo" : "Take photo"}</span>
                  </button>
                  <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={compressingPhoto} className={`grid w-12 place-items-center rounded-xl border border-slate-200 bg-white text-indigo-600 disabled:cursor-wait disabled:text-slate-300 ${photoPreview ? "h-10" : "min-h-28"}`} aria-label="Upload photo from gallery" title="Upload photo from gallery">
                    <Upload size={photoPreview ? 16 : 22} />
                  </button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void selectWorkPhoto(event)} className="sr-only" />
                <input ref={galleryInputRef} type="file" accept="image/*" onChange={(event) => void selectWorkPhoto(event)} className="sr-only" />
                <p className="mt-2 text-[9px] leading-4 text-slate-400">A work photo is required before changing the status to Waiting for Client Approval.</p>
              </section>
              {formError ? <p className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{formError}</p> : null}
              <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setMode(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving || compressingPhoto} className="h-10 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white disabled:bg-slate-300">{saving ? "Saving..." : compressingPhoto ? "Compressing..." : "Save Record"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDelete ? <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-sm font-bold text-slate-900">Delete issue record?</h2><p className="mt-2 text-xs leading-5 text-slate-500">Record <b>{pendingDelete.id}</b> will be permanently removed from the database.</p>{formError ? <p className="mt-3 text-[11px] font-semibold text-rose-600">{formError}</p> : null}<div className="mt-5 flex justify-end gap-2"><button onClick={() => setPendingDelete(null)} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button disabled={saving} onClick={confirmDelete} className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white disabled:bg-slate-300">{saving ? "Deleting..." : "Delete"}</button></div></div></div> : null}
    </>
  );
}

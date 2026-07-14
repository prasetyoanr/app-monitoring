"use client";

import { CalendarDays, Eye, Filter, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { Card, StatusBadge } from "@/components/ui";
import type { TicketRecord } from "@/data/mock-data";

type FormMode = "create" | "edit" | null;

function completionLabel(days: number | null) {
  if (days === null) return "Not completed";
  if (days === 0) return "Same day";
  return `${days} days`;
}

function formatCompactDate(value: string) {
  if (!value) return "dd/mm/yy";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

export function TicketList() {
  const { ticketRecords, addTicket, updateTicket, deleteTicket } = useAppData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [location, setLocation] = useState("All Locations");
  const [mode, setMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<TicketRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<TicketRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TicketRecord | null>(null);
  const [requestDate, setRequestDate] = useState("2026-07-13");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => ticketRecords.filter((ticket) => {
    const matchQuery = `${ticket.id} ${ticket.title} ${ticket.requester} ${ticket.division} ${ticket.category} ${ticket.location}`.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (status === "All Statuses" || ticket.status === status) && (location === "All Locations" || ticket.location === location);
  }), [ticketRecords, query, status, location]);

  function openForm(nextMode: Exclude<FormMode, null>, record: TicketRecord | null = null) {
    setSelected(record);
    setRequestDate(record?.reportedDate ?? "2026-07-13");
    setMode(nextMode);
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else { input.focus(); input.click(); }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const recordStatus = String(data.get("status"));
    const maxNumber = ticketRecords.reduce((max, item) => Math.max(max, Number(item.id.split("-").at(-1)) || 0), 0);
    const record: TicketRecord = {
      id: selected?.id ?? `INC-2026-${String(maxNumber + 1).padStart(4, "0")}`,
      title: String(data.get("title")),
      category: String(data.get("category")),
      requester: String(data.get("requester")),
      division: String(data.get("division")),
      location: String(data.get("location")),
      reportedAt: formatCompactDate(requestDate),
      reportedDate: requestDate,
      priority: String(data.get("priority")),
      status: recordStatus,
      completedDays: recordStatus === "Completed" ? Number(data.get("completedDays") || 0) : null,
      description: String(data.get("description")),
    };
    if (mode === "edit") updateTicket(record); else addTicket(record);
    setMode(null);
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label className="relative min-w-64 max-w-md flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs outline-none" placeholder="Search records or requester..." /></label>
          <label className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><select value={location} onChange={(event) => setLocation(event.target.value)} className="h-10 min-w-40 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-600 outline-none"><option>All Locations</option><option>HO</option><option>Factory</option></select></label>
          <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 min-w-44 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-600 outline-none"><option>All Statuses</option><option>New</option><option>In Progress</option><option>Waiting for Client</option><option>Completed</option></select></label>
        </div>
        <button onClick={() => openForm("create")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-[#2445b5]"><Plus size={16} /> Add Issue</button>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><div><p className="text-xs font-bold text-slate-800">Troubleshooting Records</p><p className="mt-1 text-[10px] text-slate-400">Internal IT records for the Head Office and Factory</p></div><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{filtered.length} records</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left">
            <thead className="bg-slate-50/90 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="w-12 px-4 py-3.5 text-center">No.</th><th className="px-4 py-3.5">Issue</th><th className="px-4 py-3.5">Location</th><th className="px-4 py-3.5">Requester</th><th className="px-4 py-3.5">Division</th><th className="px-4 py-3.5">Date</th><th className="px-4 py-3.5">Priority</th><th className="px-4 py-3.5">Completion Time</th><th className="px-4 py-3.5">Status</th><th className="w-36 px-5 py-3.5 text-center">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ticket, index) => (
                <tr key={ticket.id} className="text-xs hover:bg-slate-50/70">
                  <td className="px-4 py-4 text-center text-[11px] font-semibold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-4"><div className="flex items-center gap-3"><span className={`size-2 shrink-0 rounded-full ${ticket.priority === "Critical" ? "bg-rose-500" : ticket.priority === "High" ? "bg-amber-500" : "bg-blue-400"}`} /><div><p className="font-semibold text-slate-800">{ticket.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id} · {ticket.category}</p></div></div></td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold ${ticket.location === "HO" ? "bg-indigo-50 text-indigo-700" : "bg-cyan-50 text-cyan-700"}`}><MapPin size={11} />{ticket.location}</span></td>
                  <td className="px-4 py-4 text-slate-600">{ticket.requester}</td><td className="px-4 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{ticket.division}</span></td><td className="px-4 py-4 text-[11px] text-slate-500">{ticket.reportedAt}</td>
                  <td className="px-4 py-4"><StatusBadge tone={ticket.priority === "Critical" ? "red" : ticket.priority === "High" ? "amber" : "gray"}>{ticket.priority}</StatusBadge></td><td className="px-4 py-4"><span className={`text-[11px] font-semibold ${ticket.completedDays === null ? "text-slate-400" : "text-emerald-600"}`}>{completionLabel(ticket.completedDays)}</span></td><td className="px-4 py-4"><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : ticket.status === "New" ? "gray" : "amber"}>{ticket.status}</StatusBadge></td>
                  <td className="px-5 py-4"><div className="flex justify-center gap-2"><button onClick={() => setDetailRecord(ticket)} className="grid size-8 place-items-center rounded-lg bg-[#3157d5] text-white shadow-sm transition hover:bg-[#2445b5]" aria-label={`View details ${ticket.id}`} title="Detail"><Eye size={14} /></button><button onClick={() => openForm("edit", ticket)} className="grid size-8 place-items-center rounded-lg bg-amber-500 text-white shadow-sm transition hover:bg-amber-600" aria-label={`Edit ${ticket.id}`} title="Edit"><Pencil size={14} /></button><button onClick={() => setPendingDelete(ticket)} className="grid size-8 place-items-center rounded-lg bg-rose-600 text-white shadow-sm transition hover:bg-rose-700" aria-label={`Delete ${ticket.id}`} title="Delete"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? <div className="px-5 py-14 text-center text-xs text-slate-500">No records match your search.</div> : null}
        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-500">Showing {filtered.length} of {ticketRecords.length} records</div>
      </Card>

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

              <footer className="mt-12 border-t border-slate-300 pt-4 text-[10px] leading-5 text-slate-400">
                This document is an internal troubleshooting record generated from the IT Monitoring System.
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
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Location<select name="location" defaultValue={selected?.location ?? "HO"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"><option>HO</option><option>Factory</option></select></label><div className="block text-[11px] font-semibold text-slate-600"><span id="request-date-label">Request Date</span><div className="relative mt-1.5"><button type="button" onClick={openDatePicker} aria-labelledby="request-date-label" className="flex h-10 w-full items-center rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-normal text-slate-700 outline-none"><span className="flex-1">{formatCompactDate(requestDate)}</span><CalendarDays size={15} className="text-slate-400" /></button><input ref={dateInputRef} type="date" value={requestDate} onChange={(event) => setRequestDate(event.target.value)} className="absolute bottom-0 left-0 h-px w-px opacity-0" tabIndex={-1} aria-hidden="true" /></div></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Requester Name<input name="requester" required defaultValue={selected?.requester} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" /></label><label className="block text-[11px] font-semibold text-slate-600">Division<select name="division" required defaultValue={selected?.division ?? "Finance"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"><option>Finance</option><option>Legal</option><option>Purchase</option><option>Human Resources</option><option>Production</option><option>Marketing</option><option>Warehouse</option></select></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Category<select name="category" defaultValue={selected?.category ?? "Software"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"><option>Software</option><option>Hardware</option><option>Network</option><option>Server</option><option>Other</option></select></label><label className="block text-[11px] font-semibold text-slate-600">Priority<select name="priority" defaultValue={selected?.priority ?? "Low"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="block text-[11px] font-semibold text-slate-600">Status<select name="status" defaultValue={selected?.status ?? "New"} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"><option>New</option><option>In Progress</option><option>Waiting for Client</option><option>Completed</option></select></label><label className="block text-[11px] font-semibold text-slate-600">Completion Time (Days)<input name="completedDays" type="number" min="0" defaultValue={selected?.completedDays ?? 0} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none" /></label></div>
              <label className="block text-[11px] font-semibold text-slate-600">Issue Description<textarea name="description" required rows={4} defaultValue={selected?.description} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 p-3 text-xs outline-none" /></label>
              <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setMode(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button className="h-10 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white">Save Record</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDelete ? <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-sm font-bold text-slate-900">Delete issue record?</h2><p className="mt-2 text-xs leading-5 text-slate-500">Record <b>{pendingDelete.id}</b> will be removed from this frontend session.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setPendingDelete(null)} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600">Cancel</button><button onClick={() => { deleteTicket(pendingDelete.id); setPendingDelete(null); }} className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white">Delete</button></div></div></div> : null}
    </>
  );
}

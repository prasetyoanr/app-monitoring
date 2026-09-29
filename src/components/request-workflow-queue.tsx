"use client";

import { ArrowRight, ChevronDown, Route, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { RequestWorkflowPopup } from "@/components/request-workflow-popup";
import { Card } from "@/components/ui";
import type {
  AccountRole,
  ServiceAgentOption,
  TicketRecord,
} from "@/data/types";
import {
  CS_INBOX_TABS,
  csInboxEmptyMessage,
  requestBelongsToCsInboxTab,
  type CsInboxTab,
} from "@/lib/cs-inbox";
import { requestWorkflowLabel, workflowCommands } from "@/lib/request-workflow";
import { filterAndSortRequestQueue, formatQueueReportedAt, type QueueDateOrder } from "@/lib/request-queue";

function queueStatuses(role: AccountRole) {
  if (role === "receptionist") return new Set(["submitted", "needs_revision"]);
  if (role === "approver") return new Set(["waiting_approver", "ready_for_assignment"]);
  if (role === "final_approver") return new Set(["waiting_final_approver"]);
  if (role === "administrator") return new Set(["submitted", "needs_revision", "waiting_approver", "waiting_final_approver", "ready_for_assignment"]);
  return new Set<string>();
}

export function RequestWorkflowQueue({
  records,
  role,
  serviceAgents,
}: {
  records: TicketRecord[];
  role: AccountRole;
  serviceAgents: ServiceAgentOption[];
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isReceptionist = role === "receptionist";
  const [popupTicketId, setPopupTicketId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateOrder, setDateOrder] = useState<QueueDateOrder>("oldest");
  const [csTab, setCsTab] = useState<CsInboxTab>("intake");
  const visibleStatuses = useMemo(() => queueStatuses(role), [role]);
  const workflowRecords = useMemo(() => records.filter(
    (record) => record.source === "division_request" && record.workflowEnabled,
  ), [records]);
  const queue = useMemo(() => workflowRecords.filter((record) => isReceptionist
    ? requestBelongsToCsInboxTab(record.workflowStatus, csTab)
    : visibleStatuses.has(record.workflowStatus)),
  [workflowRecords, isReceptionist, csTab, visibleStatuses]);
  const visibleQueue = useMemo(() => isReceptionist
    ? filterAndSortRequestQueue(queue, fromDate, toDate, dateOrder)
    : queue,
  [queue, isReceptionist, fromDate, toDate, dateOrder]);
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);
  const hasActiveFilters = Boolean(fromDate || toDate || dateOrder !== "oldest");

  if (!isReceptionist && queue.length === 0) return null;

  function handlePopupAction() {
    setPopupTicketId(null);
  }

  return (
    <>
      <Card className="mb-5 overflow-hidden border-indigo-100 shadow-sm">
        {isReceptionist ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-[#3157d5] text-white shadow-sm"><ShieldCheck size={16} /></span>
              <h2 className="text-sm font-bold text-slate-900">GA Inbox</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800" role="status">
                {hasActiveFilters ? `${visibleQueue.length} of ${queue.length}` : queue.length} requests
              </span>
            </div>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="cs-queue-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157d5] ${filtersOpen || hasActiveFilters ? "border-blue-200 bg-blue-100 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <SlidersHorizontal size={13} aria-hidden="true" />
              Filter{hasActiveFilters ? " · Active" : ""}
              <ChevronDown size={12} aria-hidden="true" className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/60 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><ShieldCheck size={17} /></span>
              <div><p className="text-xs font-bold text-slate-800">Request Workflow Queue</p><p className="mt-0.5 text-[10px] text-slate-500">GA approvals and member assignments. The Senior Approver makes the decision, then assignment authority returns to the GA Supervisor.</p></div>
            </div>
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white">{queue.length} waiting</span>
          </div>
        )}
        {isReceptionist ? (
          <div className="overflow-x-auto border-b border-slate-100 bg-white px-4 py-2.5 sm:px-5">
            <div role="tablist" aria-label="GA queue views" className="inline-flex min-w-max rounded-xl bg-slate-100 p-1">
              {CS_INBOX_TABS.map((tab) => {
                const selected = csTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setCsTab(tab.value)}
                    className={`min-h-9 rounded-lg px-3.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157d5] focus-visible:ring-offset-1 ${selected ? "bg-white text-[#3157d5] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {isReceptionist ? (
          <div id="cs-queue-filters" hidden={!filtersOpen} className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
            <div className="grid grid-cols-1 items-end gap-3 min-[400px]:grid-cols-2 lg:grid-cols-[10rem_10rem_11rem_auto]">
              <label className="block min-w-0">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">From date</span>
                <input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} aria-invalid={invalidDateRange} aria-describedby={invalidDateRange ? "queue-date-error" : undefined} className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="block min-w-0">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">To date</span>
                <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} aria-invalid={invalidDateRange} aria-describedby={invalidDateRange ? "queue-date-error" : undefined} className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="relative block min-w-0">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">Date order</span>
                <select value={dateOrder} onChange={(event) => setDateOrder(event.target.value as QueueDateOrder)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                  <option value="oldest">Oldest first</option>
                  <option value="newest">Newest first</option>
                </select>
                <ChevronDown className="pointer-events-none absolute bottom-3 right-3 text-slate-400" size={14} />
              </label>
              <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
                {hasActiveFilters ? <button type="button" onClick={() => { setFromDate(""); setToDate(""); setDateOrder("oldest"); }} className="rounded-lg px-2 py-2 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Reset</button> : null}
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Report date (WIB) · Oldest first by default.</p>
            {invalidDateRange ? <p id="queue-date-error" role="alert" className="mt-2 text-[10px] font-semibold text-rose-600">From date must be on or before To date.</p> : null}
          </div>
        ) : null}
        {isReceptionist && hasActiveFilters && !filtersOpen ? (
          <p className="border-b border-slate-100 px-4 py-2 text-[10px] text-slate-500 sm:px-5">
            {fromDate && toDate ? `${fromDate} – ${toDate}` : fromDate ? `From ${fromDate}` : toDate ? `Until ${toDate}` : "All dates"}
            {" · "}{dateOrder === "oldest" ? "Oldest first" : "Newest first"}{" · WIB"}
            {invalidDateRange ? <span role="alert" className="ml-2 font-semibold text-rose-600">Invalid date range. Open Filter to adjust.</span> : null}
          </p>
        ) : null}
        
        {isReceptionist && visibleQueue.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-slate-500 sm:px-5">
            {invalidDateRange
              ? "Adjust the date range to view requests."
              : hasActiveFilters
                ? "No requests in this view match the selected dates."
                : csInboxEmptyMessage(csTab)}
          </p>
        ) : null}
        <div className="divide-y divide-slate-100">
          {visibleQueue.map((ticket) => {
            const options = ticket.source === "division_request" && ticket.workflowEnabled
              ? workflowCommands(role, ticket.workflowStatus, ticket.approvalRequired).filter((value: string) => value !== "resolve" || Boolean(ticket.receivingDivisionId))
              : [];
            const hasOptions = options.length > 0;

            if (isReceptionist) {
              const isSubmitted = ticket.workflowStatus === "submitted";
              const showTrackingSummary = csTab !== "intake";
              const statusTone = ticket.workflowStatus === "assigned"
                ? "bg-emerald-100 text-emerald-800"
                : ticket.workflowStatus === "rejected"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800";
              return (
                <div key={ticket.id} role="group" aria-labelledby={`queue-title-${ticket.id}`} className={`px-4 py-4 transition-colors sm:px-5`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{ticket.id}</span>
                        {!showTrackingSummary ? (
                          <>
                            <span title={requestWorkflowLabel(ticket.workflowStatus)} className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                              {isSubmitted ? "Submitted" : requestWorkflowLabel(ticket.workflowStatus)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {ticket.division} <ArrowRight size={14} className="text-indigo-600" /> <strong className="text-indigo-700">{ticket.receivingDivisionId && ticket.serviceDivision !== "GA" ? `GA → ${ticket.serviceDivision}` : ticket.serviceDivision}</strong>
                            </span>
                          </>
                        ) : null}
                      </div>
                      <h3 id={`queue-title-${ticket.id}`} className="mt-1 text-sm font-bold text-slate-900">{ticket.title}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Reported: <time dateTime={ticket.reportedAtIso} className="font-medium text-slate-700">{formatQueueReportedAt(ticket.reportedAtIso)}</time>
                      </p>
                    </div>

                    {showTrackingSummary ? (
                      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:max-w-[30rem] sm:shrink-0 sm:justify-end" aria-label="Request status and destination">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone}`}>
                          {requestWorkflowLabel(ticket.workflowStatus)}
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px]">
                          <span className="max-w-24 truncate text-slate-500" title={ticket.division}>{ticket.division}</span>
                          <ArrowRight size={13} className="shrink-0 text-indigo-500" aria-hidden="true" />
                          <strong className="max-w-28 truncate text-indigo-700" title={ticket.serviceDivision}>{ticket.receivingDivisionId && ticket.serviceDivision !== "GA" ? `GA → ${ticket.serviceDivision}` : ticket.serviceDivision}</strong>
                          {ticket.assignedTechnicianName ? (
                            <span className="truncate border-l border-slate-300 pl-2 font-medium text-slate-600" title={`Assigned member: ${ticket.assignedTechnicianName}`}>
                              {ticket.assignedTechnicianName}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        <button
                          type="button"
                          onClick={() => setPopupTicketId(ticket.id)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          <Route size={14} />
                          {ticket.workflowStatus === "submitted" ? "Request Approval" : "Take Action"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <details className="group min-w-0 text-[11px] text-slate-600">
                      <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-1 rounded-md font-semibold text-indigo-600 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 [&::-webkit-details-marker]:hidden">
                        Details <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-2 rounded-xl bg-slate-50 p-3 leading-relaxed text-slate-700">
                        <p className="whitespace-pre-wrap">{ticket.description}</p>
                        {Object.entries(ticket.requestData).map(([key, value]) => (
                          <p key={key} className="mt-1">
                            <strong className="text-slate-800">{key}:</strong> {String(value)}
                          </p>
                        ))}
                        {ticket.workflowNote ? (
                          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-800">
                            <strong>Latest note:</strong> {ticket.workflowNote}
                          </p>
                        ) : null}
                      </div>
                    </details>
                  </div>
                </div>
              );
            }

            return (
              <div key={ticket.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_14rem_14rem_auto] lg:items-end">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[9px] font-bold text-slate-400">{ticket.id}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">{requestWorkflowLabel(ticket.workflowStatus)}</span></div>
                  <p className="mt-2 truncate text-xs font-bold text-slate-800">{ticket.title}</p>
                  <p aria-label={`Report route: from ${ticket.division} to ${ticket.serviceDivision}`} className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500">From <b className="text-slate-700">{ticket.division}</b></span>
                    <span aria-hidden="true" className="font-bold text-indigo-400">→</span>
                    <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">Report destination: {ticket.serviceDivision}</span>
                  </p>
                  <details className="mt-2 text-[10px] text-slate-600"><summary className="cursor-pointer font-semibold text-indigo-600">Request details</summary><p className="mt-2 whitespace-pre-wrap leading-5">{ticket.description}</p>{Object.entries(ticket.requestData).map(([key, value]) => <p key={key} className="mt-1 break-words"><b>{key}:</b> {value}</p>)}</details>
                  {ticket.workflowNote ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[10px] leading-4 text-amber-800"><b>Latest note:</b> {ticket.workflowNote}</p> : null}
                </div>
                {hasOptions ? (
                  <button
                    type="button"
                    onClick={() => setPopupTicketId(ticket.id)}
                    className={`inline-flex h-10 w-fit items-center justify-center justify-self-end gap-2 rounded-xl border px-4 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 lg:col-start-4 ${ticket.workflowStatus === "ready_for_assignment" ? "border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-400" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-400"}`}
                  >
                    <Route size={14} />
                    {ticket.workflowStatus === "waiting_approver" ? "Approve / Reject" : ticket.workflowStatus === "waiting_final_approver" ? "Senior Decision" : ticket.workflowStatus === "ready_for_assignment" ? "Assign Member" : "Take Action"}
                  </button>
                ) : (
                  <p className="self-center text-[10px] font-semibold text-slate-400">Waiting for the next approver.</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {popupTicketId ? (
        <RequestWorkflowPopup
          record={records.find((r) => r.id === popupTicketId)!}
          role={role}
          serviceAgents={serviceAgents}
          onAction={handlePopupAction}
          onClose={() => setPopupTicketId(null)}
        />
      ) : null}
    </>
  );
}

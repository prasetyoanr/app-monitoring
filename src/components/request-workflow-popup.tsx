"use client";

import { CheckCircle2, ChevronDown, LoaderCircle, Route, X } from "lucide-react";
import { useState, useTransition } from "react";

import { updateRequestWorkflowAction } from "@/app/inbox/workflow-actions";
import type {
  AccountRole,
  RequestWorkflowCommand,
  ServiceAgentOption,
  TicketRecord,
} from "@/data/types";
import { requestWorkflowLabel, workflowCommands, workflowNoteError } from "@/lib/request-workflow";

type CommandOption = { value: RequestWorkflowCommand; label: string };

function commandOptions(role: AccountRole, ticket: TicketRecord): CommandOption[] {
  if (ticket.source !== "division_request" || !ticket.workflowEnabled) return [];
  const labels: Record<RequestWorkflowCommand, string> = {
    resolve: "Resolve Without Assignment",
    send_for_approval: "Request GA Supervisor Approval",
    direct_assign: "Assign Directly",
    approve: ticket.workflowStatus === "waiting_final_approver" ? "Approve as Senior Approver" : "Approve",
    escalate: "Request Senior Approval",
    return: ticket.workflowStatus === "waiting_final_approver" ? "Return to GA Supervisor" : "Return for Review",
    reject: "Reject",
    assign: "Assign Member",
  };
  return workflowCommands(role, ticket.workflowStatus, ticket.approvalRequired).filter((value) => value !== "resolve" || Boolean(ticket.receivingDivisionId)).map((value) => ({ value, label: labels[value] }));
}

export function RequestWorkflowPopup({
  record,
  role,
  serviceAgents,
  onAction,
  onClose,
}: {
  record: TicketRecord;
  role: AccountRole;
  serviceAgents: ServiceAgentOption[];
  onAction: (command: RequestWorkflowCommand) => void;
  onClose: () => void;
}) {
  const isReceptionist = role === "receptionist";
  const [command, setCommand] = useState<RequestWorkflowCommand | "">("");
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [unit, setUnit] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [workflowStatusOverride, setWorkflowStatusOverride] = useState<TicketRecord["workflowStatus"] | null>(null);
  const isAssignmentFollowUp = workflowStatusOverride === "ready_for_assignment";
  const activeRecord = workflowStatusOverride
    ? { ...record, workflowStatus: workflowStatusOverride }
    : record;

  const options = commandOptions(role, activeRecord);
  const needsAssignee = command === "direct_assign" || command === "assign";
  const eligibleAgents = serviceAgents.filter(
    (agent) => record.receivingDivisionId ? agent.isGaUnit : agent.division === record.serviceDivision,
  );
  const unitOptions = [...new Map(eligibleAgents.map((agent) => [agent.divisionId, agent.division])).entries()];
  const agents = eligibleAgents.filter((agent) => agent.divisionId === unit);

  function handleApply() {
    if (!command) {
      setError("Select a workflow action first.");
      return;
    }
    const noteError = workflowNoteError(command, note.trim());
    if (noteError) {
      setError(noteError);
      return;
    }
    if (needsAssignee && !assignee) {
      setError("Select an assigned member.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await updateRequestWorkflowAction({
          issueId: record.id,
          command,
          note: note.trim(),
          assigneeId: assignee || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (role === "approver" && command === "approve" && record.workflowStatus === "waiting_approver") {
          setWorkflowStatusOverride("ready_for_assignment");
          setCommand("assign");
          setNote("");
          setUnit("");
          setAssignee("");
          return;
        }
        onAction(command);
      } catch {
        setError("The server could not be reached. Please try again.");
      }
    });
  }

  const controlTextClass = isReceptionist ? "text-[11px]" : "text-[10px]";
  const fieldLabelClass = `mb-1 block text-[9px] font-bold uppercase tracking-wide ${isReceptionist ? "text-slate-500" : "text-slate-400"}`;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="workflow-popup-title">
      <div key={isAssignmentFollowUp ? "assignment" : "decision"} className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3157d5]">{isAssignmentFollowUp ? "Next Step · Assignment" : "Workflow Action"}</p>
            <h2 id="workflow-popup-title" className="mt-1 text-base font-bold text-slate-900">{record.id} — {record.title}</h2>
            <p className="mt-1 text-[10px] text-slate-500">Status: {requestWorkflowLabel(activeRecord.workflowStatus)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close popup"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {isAssignmentFollowUp ? (
            <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              <CheckCircle2 className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
              <div>
                <p className="text-[11px] font-bold">Approval saved successfully.</p>
                <p className="mt-0.5 text-[10px] leading-4">Continue by selecting the service unit and assigned member.</p>
              </div>
            </div>
          ) : null}
          {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[10px] font-semibold leading-5 text-rose-700">{error}</p> : null}

          {!isAssignmentFollowUp ? (
            <label className="relative block">
              <span className={fieldLabelClass}>Decision</span>
              <select
                disabled={isPending}
                value={command}
                onChange={(e) => { setCommand(e.target.value as RequestWorkflowCommand); setError(""); }}
                className={`h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 ${controlTextClass} font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`}
              >
                <option value="">Select action</option>
                {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute bottom-3 right-3 text-slate-400" size={14} aria-hidden="true" />
            </label>
          ) : null}

          {needsAssignee ? (
            <>
              <label className="block">
                <span className={fieldLabelClass}>Service Unit</span>
                <select
                  disabled={isPending}
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); setAssignee(""); }}
                  className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 ${controlTextClass}`}
                >
                  <option value="">Select GA unit</option>
                  {unitOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={fieldLabelClass}>Assigned Member</span>
                <select
                  disabled={isPending}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 ${controlTextClass} font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`}
                >
                  <option value="">Select agent</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </label>
              {eligibleAgents.length === 0 ? <p className="text-[10px] text-amber-700">No active members are available.</p> : null}
            </>
          ) : (
            <label className="block">
              <span className={fieldLabelClass}>{command === "resolve" ? "Resolution Details (required)" : isReceptionist ? "Note (optional)" : "Note"}</span>
              <textarea
                disabled={isPending}
                value={note}
                onChange={(e) => { setNote(e.target.value); setError(""); }}
                maxLength={1000}
                rows={3}
                placeholder={isReceptionist ? "Add context for the approver" : "Optional; required for return/reject"}
                className={`w-full resize-y rounded-xl border border-slate-200 px-3 py-2 ${controlTextClass} outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${isReceptionist ? "bg-white" : ""}`}
              />
            </label>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-slate-100 bg-white px-4 py-4 sm:flex sm:items-center sm:justify-end sm:px-5">
          <button type="button" onClick={onClose} disabled={isPending} className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:h-10 sm:w-auto">{isAssignmentFollowUp ? "Assign Later" : "Cancel"}</button>
          <button type="button" disabled={isPending || !command || (needsAssignee && !assignee)} onClick={handleApply} className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 ${controlTextClass} font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-10 sm:w-auto`}>
            {isPending ? <LoaderCircle className="animate-spin" size={14} /> : command === "approve" ? <CheckCircle2 size={14} /> : <Route size={14} />}
            {isPending ? "Saving..." : isAssignmentFollowUp ? "Assign Member" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

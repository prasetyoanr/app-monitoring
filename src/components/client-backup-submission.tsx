"use client";

import { CheckCircle2, DatabaseBackup, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

import { submitBackupInvitationAction } from "@/app/backups/actions";
import type { BackupInvitationRecord } from "@/data/backup-invitations";

export function ClientBackupSubmission({ invitation, divisionOptions }: { invitation: BackupInvitationRecord; divisionOptions: string[] }) {
  const [submittedId, setSubmittedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [divisionSelection, setDivisionSelection] = useState(divisionOptions[0] ?? "Other");
  const [customDivision, setCustomDivision] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    const result = await submitBackupInvitationAction({
      token: invitation.token,
      fullName: String(data.get("fullName") ?? ""),
      division:
        divisionSelection === "Other" ? customDivision : divisionSelection,
      email: String(data.get("email") ?? ""),
      username: String(data.get("username") ?? ""),
      passwordInformation: String(data.get("passwordInformation") ?? ""),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSubmittedId(result.data.id);
  }

  if (submittedId) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/60">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={32} /></span>
          <h1 className="mt-5 text-xl font-bold text-slate-900">Information submitted</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Thank you. Your backup account information has been sent to the IT team.</p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Reference Number</p><p className="mt-1 font-mono text-sm font-semibold text-slate-700">{submittedId}</p></div>
          <p className="mt-5 text-[10px] leading-5 text-slate-400">You may close this page.</p>
        </section>
      </main>
    );
  }

  if (invitation.status !== "pending") {
    const used = invitation.status === "submitted";
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
          <XCircle className="mx-auto text-amber-500" size={48} />
          <h1 className="mt-4 text-xl font-bold text-slate-900">{used ? "Link already used" : "Link unavailable"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{used ? "This information form has already been submitted." : "Ask the IT team to generate a new client link."}</p>
        </section>
      </main>
    );
  }

  const inputClass = "mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-indigo-950 px-4 pb-12 pt-7 text-white text-center">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200"><ShieldCheck size={15} /> Secure Client Form</div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Monitoring Synology Account</h1>
        </div>
      </div>

      <div className="mx-auto -mt-6 max-w-md px-4">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-[#3157d5]"><DatabaseBackup size={21} /></span>
            <div><h2 className="text-sm font-bold text-slate-900">Account Information</h2><p className="mt-1 text-[10px] text-slate-500">Complete the account details below.</p></div>
          </div>

          <form onSubmit={submit} className="space-y-4 p-5">
            <label className="block text-[11px] font-semibold text-slate-600">Full Name<input name="fullName" required maxLength={120} autoComplete="name" className={inputClass} placeholder="Enter your full name" /></label>
            <label className="block text-[11px] font-semibold text-slate-600">Division<select required value={divisionSelection} onChange={(event) => setDivisionSelection(event.target.value)} className={inputClass}>{divisionOptions.map((division) => <option key={division} value={division}>{division}</option>)}<option value="Other">Other</option></select></label>
            {divisionSelection === "Other" ? <label className="block text-[11px] font-semibold text-slate-600">Other Division<input required value={customDivision} onChange={(event) => setCustomDivision(event.target.value)} maxLength={120} autoComplete="organization-title" className={inputClass} placeholder="Enter your division" /></label> : null}
            <label className="block text-[11px] font-semibold text-slate-600">Email<input name="email" type="email" maxLength={254} autoComplete="email" inputMode="email" className={inputClass} placeholder="name@company.com" /></label>
            <label className="block text-[11px] font-semibold text-slate-600">Synology Username<input name="username" required maxLength={120} autoCapitalize="none" autoComplete="off" className={inputClass} placeholder="Enter Synology username" /></label>
            <label className="block text-[11px] font-semibold text-slate-600">Synology Password<input name="passwordInformation" required type="text" maxLength={2000} autoCapitalize="none" autoComplete="off" spellCheck={false} className={inputClass} placeholder="Enter Synology password" /></label>

            {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold leading-5 text-rose-700">{error}</p> : null}
            <button disabled={submitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3157d5] text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:bg-slate-300"><CheckCircle2 size={17} />{submitting ? "Submitting..." : "Submit Information"}</button>
          </form>
        </section>
        <p className="px-4 pt-5 text-center text-[9px] leading-4 text-slate-400">This is a single-use form. The link becomes invalid after submission.</p>
      </div>
    </main>
  );
}

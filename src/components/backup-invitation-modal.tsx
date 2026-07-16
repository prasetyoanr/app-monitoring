"use client";

import { Check, Clipboard, ExternalLink, Link2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { createBackupInvitationAction } from "@/app/backups/actions";

export function BackupInvitationModal({ onClose }: { onClose: () => void }) {
  const [invitationUrl, setInvitationUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function generateLink() {
    setGenerating(true);
    setError("");
    const result = await createBackupInvitationAction();
    setGenerating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setInvitationUrl(
      `${window.location.origin}/b/${encodeURIComponent(result.data.token)}`,
    );
    setExpiresAt(result.data.expiresAt);
  }

  async function copyLink() {
    if (!invitationUrl) return;
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="backup-invitation-title">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3157d5]">Client Submission</p>
            <h2 id="backup-invitation-title" className="mt-1 text-base font-bold text-slate-900">Share backup information form</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close invitation"><X size={18} /></button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-blue-50 p-4 text-[11px] leading-5 text-blue-800">
            Send this link to one client. They will only enter their name, division, email, Synology username, and Synology password.
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-[11px] font-semibold leading-5 text-rose-700">{error}</p>
          ) : invitationUrl ? (
            <>
              <label className="block text-[11px] font-semibold text-slate-600">One-time client link
                <textarea readOnly value={invitationUrl} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] leading-5 text-slate-600 outline-none" />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button onClick={copyLink} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3157d5] text-xs font-semibold text-white">
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? "Copied" : "Copy Link"}
                </button>
                <Link href={invitationUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"><ExternalLink size={15} /> Preview Form</Link>
              </div>
              <p className="text-center text-[9px] leading-4 text-slate-400">Single use · Expires {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(expiresAt))}</p>
            </>
          ) : (
            <button onClick={generateLink} disabled={generating} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3157d5] text-xs font-semibold text-white disabled:bg-slate-300"><Link2 size={15} />{generating ? "Generating..." : "Generate Secure Link"}</button>
          )}
        </div>
      </section>
    </div>
  );
}

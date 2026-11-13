"use client";

import {
  ExternalLink,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/ui";
import type { KpiAttachment, KpiItem } from "@/data/kpi-mock";
import {
  fileKindFromName,
  formatFileSize,
  KPI_ATTACHMENT_MAX_BYTES,
  normalizeAttachmentLink,
} from "@/lib/kpi-attachment";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function AttachmentIcon({ attachment }: { attachment: KpiAttachment }) {
  const className = "size-4";
  if (attachment.type === "link") {
    return attachment.isSpreadsheet ? <FileSpreadsheet className={className} /> : <Link2 className={className} />;
  }
  const kind = fileKindFromName(attachment.fileName ?? "");
  if (kind === "spreadsheet") return <FileSpreadsheet className={className} />;
  if (kind === "document") return <FileText className={className} />;
  if (kind === "image") return <ImageIcon className={className} />;
  return <FileIcon className={className} />;
}

function attachmentMeta(attachment: KpiAttachment) {
  const kind =
    attachment.type === "link"
      ? attachment.isSpreadsheet
        ? "Spreadsheet link"
        : "Link"
      : `File · ${formatFileSize(attachment.fileSize ?? 0)}`;
  const source = attachment.type === "link" ? attachment.host : attachment.fileName;
  return `${kind} · ${source} · ${attachment.addedBy}, ${attachment.addedAt}`;
}

export function KpiAttachmentDialog({
  item,
  canAdd,
  canRemove,
  onAddLink,
  onAddFile,
  onRemove,
  onClose,
}: {
  item: KpiItem;
  canAdd: boolean;
  canRemove: boolean;
  onAddLink: (title: string, url: string) => Promise<void>;
  onAddFile: (title: string, file: File) => Promise<void>;
  onRemove: (attachmentId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"file" | "link">("link");
  const [url, setUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setUrl("");
    setTitle("");
    setFile(null);
    setError(null);
  }

  async function add() {
    setBusy(true);
    try {
    if (mode === "link") {
      const result = normalizeAttachmentLink(url);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      await onAddLink(title.trim() || result.host, result.url);
    } else {
      if (!file) {
        setError("Choose a file first.");
        return;
      }
      if (file.size > KPI_ATTACHMENT_MAX_BYTES) {
        setError(`File is too large. The limit is ${formatFileSize(KPI_ATTACHMENT_MAX_BYTES)}.`);
        return;
      }
      await onAddFile(title.trim() || file.name, file);
    }
    reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lampiran gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900">Attachments</h2>
            <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-500">{item.name}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {item.attachments.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-500">
              No attachments yet. Add a file or a link to support this KPI.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {item.attachments.map((attachment) => {
                const href = attachment.type === "link" ? attachment.url : attachment.previewUrl;
                return (
                  <li key={attachment.id} className="flex items-start gap-3 px-3 py-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                      <AttachmentIcon attachment={attachment} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{attachment.title}</p>
                      <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-500">{attachmentMeta(attachment)}</p>
                    </div>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label={`Open ${attachment.title}`}>
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <StatusBadge tone="gray">Tidak tersedia</StatusBadge>
                    )}
                    {canRemove ? (
                      <button type="button" disabled={busy} onClick={async () => { try { setBusy(true); await onRemove(attachment.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Lampiran gagal dihapus."); } finally { setBusy(false); } }} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${attachment.title}`}>
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {canAdd ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <div className="mb-3 inline-flex rounded-lg bg-white p-1 text-[12px] font-bold ring-1 ring-indigo-100">
                {([["link", "Add link", Link2], ["file", "Upload file", Upload]] as const).map(([key, label, Icon]) => (
                  <button key={key} type="button" onClick={() => { setMode(key); setError(null); }} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition ${mode === key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {mode === "link" ? (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Link</span>
                    <input className={inputClass} value={url ?? ""} onChange={(event) => setUrl(event.target.value)} placeholder="Spreadsheet, document, or any web link" />
                  </label>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">File</span>
                    <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-[12px] text-slate-600 file:mr-3 file:h-10 file:cursor-pointer file:rounded-xl file:border-0 file:bg-white file:px-4 file:text-sm file:font-bold file:text-indigo-700 file:ring-1 file:ring-indigo-200 hover:file:bg-indigo-50" />
                    <span className="mt-1 block text-[11px] text-slate-400">Any file type, up to {formatFileSize(KPI_ATTACHMENT_MAX_BYTES)}.</span>
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Title (optional)</span>
                  <input className={inputClass} value={title ?? ""} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Stock opname report Q2" />
                </label>
              </div>

              {error ? <p className="mt-3 text-[12px] font-bold text-rose-600">{error}</p> : null}

              <button type="button" disabled={busy} onClick={add} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                {mode === "link" ? <Link2 className="size-4" /> : <Upload className="size-4" />} Add attachment
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">Only the KPI owner can add attachments. You can open the items above to verify them.</p>
          )}
        </div>
      </div>
    </div>
  );
}

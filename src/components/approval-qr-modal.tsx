"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { TicketRecord } from "@/data/mock-data";

export function ApprovalQrModal({ record, onClose }: { record: TicketRecord; onClose: () => void }) {
  const [approvalUrl, setApprovalUrl] = useState("");
  const [qrImage, setQrImage] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/troubleshooting/approval/${encodeURIComponent(record.id)}`;
    QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M", color: { dark: "#14213d", light: "#ffffff" } })
      .then((image) => {
        setApprovalUrl(url);
        setQrImage(image);
      })
      .catch(() => setQrImage(""));
  }, [record.id]);

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="approval-qr-title">
      <div className="mx-auto my-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#3157d5]">Client Approval</p><h2 id="approval-qr-title" className="mt-1 text-base font-bold text-slate-900">Scan QR untuk tanda tangan</h2></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close approval QR"><X size={18} /></button>
        </div>

        <div className="p-5">
          <div className="rounded-xl bg-slate-50 p-3"><p className="font-mono text-[10px] text-slate-400">{record.id}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-800">{record.title}</p><p className="mt-1 text-[10px] text-slate-500">Pelapor: {record.requester}</p></div>

          <div className="mx-auto mt-5 grid size-[248px] place-items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {qrImage ? <Image src={qrImage} width={224} height={224} unoptimized alt={`QR approval for ${record.id}`} className="size-56" /> : <div className="grid place-items-center gap-2 text-center text-xs text-slate-400"><QrCode size={32} /><span>Generating QR...</span></div>}
          </div>

          <ol className="mt-5 space-y-2 text-[11px] leading-5 text-slate-600">
            <li><b>1.</b> Client memindai QR menggunakan kamera ponsel.</li>
            <li><b>2.</b> Client memeriksa ringkasan pekerjaan.</li>
            <li><b>3.</b> Client menandatangani dan mengirim persetujuan.</li>
          </ol>

          {approvalUrl ? <Link href={approvalUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"><ExternalLink size={14} /> Preview halaman client</Link> : null}
          <p className="mt-3 text-center text-[9px] leading-4 text-slate-400">Pada produksi, QR harus memakai token sekali pakai dan kedaluwarsa otomatis.</p>
        </div>
      </div>
    </div>
  );
}

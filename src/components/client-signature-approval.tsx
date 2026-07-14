"use client";

import Image from "next/image";
import { CheckCircle2, Download, Eraser, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import type { TicketRecord } from "@/data/mock-data";

type ApprovalView = "approval" | "reject" | "approved" | "rejected";

export function ClientSignatureApproval({ ticket }: { ticket: TicketRecord }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [view, setView] = useState<ApprovalView>("approval");
  const [clientName, setClientName] = useState(ticket.requester);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.getBoundingClientRect().width;
    canvas.width = width * ratio;
    canvas.height = 180 * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.25;
    context.strokeStyle = "#14213d";
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const position = point(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
    drawingRef.current = true;
    setSignatureError("");
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const position = point(event);
    context.lineTo(position.x, position.y);
    context.stroke();
    setHasSignature(true);
  }

  function stopDrawing() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    setHasSignature(false);
    setSignatureError("");
  }

  function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSignature) {
      setSignatureError("Tanda tangan diperlukan sebelum pekerjaan disetujui.");
      return;
    }
    const signature = canvasRef.current?.toDataURL("image/png") ?? "";
    setSignatureImage(signature);
    setSubmittedAt(new Date().toLocaleString("id-ID"));
    setView("approved");
  }

  function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedAt(new Date().toLocaleString("id-ID"));
    setView("rejected");
  }

  async function downloadApprovalPdf() {
    if (!signatureImage) return;
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const document = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = document.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = 48;

      document.setFillColor(20, 33, 61);
      document.rect(0, 0, pageWidth, 34, "F");
      document.setTextColor(255, 255, 255);
      document.setFont("helvetica", "bold");
      document.setFontSize(17);
      document.text("CLIENT WORK COMPLETION APPROVAL", margin, 17);
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      document.text(`Document No. ${ticket.id}`, margin, 25);

      document.setTextColor(20, 33, 61);
      document.setFont("helvetica", "bold");
      document.setFontSize(10);
      document.text("ISSUE INFORMATION", margin, y);
      y += 7;
      document.setDrawColor(210, 215, 225);
      document.line(margin, y, pageWidth - margin, y);
      y += 8;

      const addField = (label: string, value: string) => {
        document.setFont("helvetica", "bold");
        document.setFontSize(8);
        document.setTextColor(120, 130, 150);
        document.text(label.toUpperCase(), margin, y);
        y += 5;
        document.setFont("helvetica", "normal");
        document.setFontSize(10);
        document.setTextColor(30, 40, 60);
        const lines = document.splitTextToSize(value || "-", contentWidth);
        document.text(lines, margin, y);
        y += (lines.length * 5) + 5;
      };

      addField("Issue", ticket.title);
      addField("Reporter", `${ticket.requester} - ${ticket.division} - ${ticket.location}`);
      addField("Resolution Summary", ticket.resolution);

      y += 2;
      document.setFont("helvetica", "bold");
      document.setFontSize(10);
      document.setTextColor(20, 33, 61);
      document.text("CLIENT APPROVAL", margin, y);
      y += 7;
      document.line(margin, y, pageWidth - margin, y);
      y += 8;
      addField("Approved By", clientName);
      addField("Approved At", submittedAt);

      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      document.setTextColor(120, 130, 150);
      document.text("SIGNATURE", margin, y);
      y += 4;
      document.setDrawColor(220, 225, 232);
      document.roundedRect(margin, y, 78, 45, 2, 2, "S");
      document.addImage(signatureImage, "PNG", margin + 4, y + 4, 70, 37);
      y += 53;

      document.setFillColor(236, 253, 245);
      document.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");
      document.setTextColor(5, 120, 85);
      document.setFont("helvetica", "bold");
      document.setFontSize(9);
      document.text("APPROVED - Work inspected and accepted by the reporter.", margin + 5, y + 9);

      document.setTextColor(150, 158, 175);
      document.setFont("helvetica", "normal");
      document.setFontSize(8);
      document.text("Generated by IT Activity Log", margin, 286);
      document.text("Page 1 of 1", pageWidth - margin, 286, { align: "right" });
      document.save(`troubleshooting-approval-${ticket.id}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }

  if (view === "approved" || view === "rejected") {
    const approved = view === "approved";
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/60">
          <span className={`mx-auto grid size-16 place-items-center rounded-full ${approved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{approved ? <CheckCircle2 size={32} /> : <XCircle size={32} />}</span>
          <h1 className="mt-5 text-xl font-bold text-slate-900">{approved ? "Pekerjaan disetujui" : "Perbaikan lanjutan diminta"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{approved ? "Terima kasih. Konfirmasi dan tanda tangan Anda telah diterima." : "Terima kasih. Issue akan dikembalikan kepada tim IT untuk ditindaklanjuti."}</p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left"><p className="font-mono text-[10px] text-slate-400">{ticket.id}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-800">{ticket.title}</p><p className="mt-3 text-[10px] text-slate-400">Dikirim {submittedAt}</p></div>
          {approved && signatureImage ? <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-left"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tanda tangan {clientName}</p><Image src={signatureImage} width={280} height={120} unoptimized alt="Client signature" className="mt-2 h-24 w-full object-contain" /></div> : null}
          {approved ? <button onClick={downloadApprovalPdf} disabled={exportingPdf || !signatureImage} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3157d5] text-xs font-semibold text-white disabled:bg-slate-300"><Download size={15} /> {exportingPdf ? "Membuat PDF..." : "Unduh PDF dengan tanda tangan"}</button> : null}
          <p className="mt-5 text-[10px] leading-5 text-slate-400">Anda dapat menutup halaman ini.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-[#14213d] px-4 pb-10 pt-6 text-white">
        <div className="mx-auto max-w-md"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200"><ShieldCheck size={15} /> Client Confirmation</div><h1 className="mt-3 text-2xl font-bold tracking-tight">Konfirmasi pekerjaan IT</h1><p className="mt-2 text-xs leading-5 text-slate-300">Periksa ringkasan pekerjaan sebelum memberikan persetujuan.</p></div>
      </div>

      <div className="mx-auto -mt-5 max-w-md px-4">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="border-b border-slate-100 p-5"><p className="font-mono text-[10px] text-slate-400">{ticket.id}</p><h2 className="mt-1.5 text-base font-bold leading-6 text-slate-900">{ticket.title}</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pelapor</dt><dd className="mt-1 font-medium text-slate-700">{ticket.requester}</dd></div><div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Lokasi</dt><dd className="mt-1 font-medium text-slate-700">{ticket.location}</dd></div></dl></div>

          {view === "approval" ? (
            <form onSubmit={approve} className="space-y-5 p-5">
              <div><h3 className="text-xs font-bold text-slate-900">Ringkasan pekerjaan</h3><p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">{ticket.resolution}</p></div>
              <label className="block text-[11px] font-semibold text-slate-600">Nama client<input value={clientName} onChange={(event) => setClientName(event.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>
              <div><div className="flex items-center justify-between"><label className="text-[11px] font-semibold text-slate-600" htmlFor="client-signature">Tanda tangan</label><button type="button" onClick={clearSignature} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Eraser size={13} /> Hapus</button></div><canvas ref={canvasRef} id="client-signature" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing} className="mt-1.5 h-[180px] w-full touch-none rounded-xl border border-dashed border-slate-300 bg-slate-50" aria-label="Signature area" /><p className="mt-2 text-[10px] text-slate-400">Gunakan jari atau stylus pada area di atas.</p>{signatureError ? <p className="mt-2 text-[10px] font-semibold text-rose-600">{signatureError}</p> : null}</div>
              <p className="rounded-xl bg-blue-50 p-3 text-[10px] leading-5 text-blue-700">Dengan menandatangani, saya menyatakan pekerjaan di atas telah diperiksa dan selesai.</p>
              <div className="grid gap-2"><button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3157d5] text-sm font-semibold text-white shadow-lg shadow-blue-600/20"><CheckCircle2 size={17} /> Setujui & tanda tangani</button><button type="button" onClick={() => setView("reject")} className="h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Pekerjaan belum selesai</button></div>
            </form>
          ) : (
            <form onSubmit={reject} className="space-y-5 p-5"><div><h3 className="text-sm font-bold text-slate-900">Pekerjaan belum selesai</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Jelaskan bagian yang masih perlu diperbaiki oleh tim IT.</p></div><label className="block text-[11px] font-semibold text-slate-600">Alasan<textarea name="reason" required rows={5} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" placeholder="Tuliskan masalah yang masih terjadi..." /></label><div className="grid gap-2"><button type="submit" className="h-12 rounded-xl bg-amber-500 text-sm font-semibold text-white">Kirim untuk ditindaklanjuti</button><button type="button" onClick={() => setView("approval")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"><RotateCcw size={14} /> Kembali</button></div></form>
          )}
        </section>
        <p className="px-4 pt-5 text-center text-[9px] leading-4 text-slate-400">Prototipe frontend — penyimpanan dan verifikasi lintas perangkat memerlukan backend.</p>
      </div>
    </main>
  );
}

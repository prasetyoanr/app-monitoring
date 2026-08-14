"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, LoaderCircle, Plus, TicketCheck, Upload, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";

import { createRequesterTicketAction } from "@/app/troubleshooting/actions";
import type { TicketRecord } from "@/data/types";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { compressWorkPhoto, formatPhotoSize } from "@/lib/work-photo";

function statusTone(status: TicketRecord["status"]): "green" | "blue" | "amber" | "red" | "gray" {
  if (status === "Completed") return "green";
  if (status === "In Progress") return "blue";
  if (status === "Reopened") return "amber";
  if (status === "New") return "green";
  return "gray";
}

export function RequestPortal({
  initialRecords,
  categories,
  locations,
  division,
}: {
  initialRecords: TicketRecord[];
  categories: string[];
  locations: string[];
  division: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function resetPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    setCompressingPhoto(false);
  }

  function openRequestForm() {
    setError(null);
    resetPhoto();
    setOpen(true);
  }

  function closeRequestForm() {
    setOpen(false);
    setError(null);
    resetPhoto();
  }

  async function selectRequesterPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCompressingPhoto(true);
    setError(null);
    try {
      const compressed = await compressWorkPhoto(file);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Foto tidak dapat diproses.");
    } finally {
      setCompressingPhoto(false);
    }
  }

  function removeRequesterPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (photoFile) data.set("requesterPhoto", photoFile);
    setSaving(true);
    setError(null);
    const result = await createRequesterTicketAction(data);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    form.reset();
    resetPhoto();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Layanan Internal"
        title="Permintaan Saya"
        description="Buat permintaan bantuan dan pantau status tiket yang Anda ajukan. Data yang tampil hanya milik akun Anda."
        action={
          <button type="button" onClick={openRequestForm} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-[#2445b5]">
            <Plus size={16} /> Buat Permintaan
          </button>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-extrabold text-slate-800">Riwayat permintaan</h2>
          <p className="mt-1 text-[11px] text-slate-500">Divisi: {division ?? "Belum diatur"}</p>
        </div>
        {initialRecords.length === 0 ? (
          <div className="grid place-items-center gap-2 px-5 py-16 text-center">
            <TicketCheck className="text-indigo-300" size={30} />
            <p className="text-sm font-semibold text-slate-700">Belum ada permintaan</p>
            <p className="max-w-sm text-xs leading-5 text-slate-500">Klik “Buat Permintaan” untuk mengirim kebutuhan bantuan ke petugas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {initialRecords.map((record) => (
              <article key={record.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-[10px] text-slate-400">{record.id}</p>
                    <StatusBadge tone={statusTone(record.status)} attention={record.status === "New"}>{record.status}</StatusBadge>
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-slate-800">{record.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-500">{record.category} · {record.location} · {record.reportedAt}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="request-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div><h2 id="request-title" className="text-base font-bold text-slate-900">Buat Permintaan</h2><p className="mt-1 text-[11px] text-slate-500">Permintaan akan diteruskan ke petugas divisi {division ?? "Anda"}.</p></div>
              <button type="button" onClick={closeRequestForm} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup"><X size={17} /></button>
            </div>
            <form onSubmit={submit} className="space-y-4 p-5">
              <label className="block text-[11px] font-semibold text-slate-600">Judul permintaan<input name="title" required maxLength={200} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400" placeholder="Contoh: Laptop tidak dapat terhubung ke Wi-Fi" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[11px] font-semibold text-slate-600">Kategori<select name="category" required defaultValue={categories[0] ?? ""} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{categories.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label className="block text-[11px] font-semibold text-slate-600">Lokasi<select name="location" required defaultValue={locations[0] ?? ""} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none">{locations.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              </div>
              <label className="block text-[11px] font-semibold text-slate-600">Jelaskan kebutuhan<textarea name="description" required maxLength={10000} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs leading-5 outline-none focus:border-indigo-400" placeholder="Tuliskan kendala atau kebutuhan Anda secara rinci." /></label>
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby="requester-photo-title">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 id="requester-photo-title" className="text-[11px] font-semibold text-slate-700">Foto pendukung <span className="font-normal text-slate-400">(opsional)</span></h3><p className="mt-1 text-[10px] leading-4 text-slate-500">Tambahkan foto kendala jika membantu petugas memahami permintaan. Foto akan dikompres menjadi JPEG maksimal 2 MB.</p></div>
                    {photoPreview ? <button type="button" onClick={removeRequesterPhoto} disabled={compressingPhoto} className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 disabled:opacity-50">Hapus</button> : null}
                  </div>
                  {photoPreview ? <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2"><Image src={photoPreview} width={720} height={540} unoptimized alt="Pratinjau foto pendukung" className="h-48 w-full rounded-lg object-contain sm:h-56" /><div className="mt-2 flex items-center justify-between gap-2 px-1"><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600"><CheckCircle2 size={13} /> Siap dikirim</span><span className="text-[10px] text-slate-400">{photoFile ? formatPhotoSize(photoFile.size) : "Foto tersimpan"}</span></div></div> : null}
                  <div className={`grid grid-cols-[minmax(0,1fr)_3rem] gap-2 ${photoPreview ? "mt-2" : "mt-3"}`}>
                    <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={compressingPhoto} className={`flex w-full items-center justify-center rounded-xl border border-blue-300 bg-white px-4 text-center font-semibold text-blue-700 disabled:cursor-wait disabled:text-slate-400 ${photoPreview ? "h-10 gap-2 text-[10px]" : "min-h-24 flex-col text-[11px]"}`}>{compressingPhoto ? <LoaderCircle size={photoPreview ? 14 : 22} className="animate-spin" /> : <Camera size={photoPreview ? 14 : 22} />}<span className={photoPreview ? "" : "mt-2"}>{compressingPhoto ? "Memproses foto..." : photoPreview ? "Ambil foto baru" : "Ambil foto"}</span></button>
                    <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={compressingPhoto} className={`grid w-12 place-items-center rounded-xl border border-slate-200 bg-white text-indigo-600 disabled:cursor-wait disabled:text-slate-300 ${photoPreview ? "h-10" : "min-h-24"}`} aria-label="Pilih foto dari galeri" title="Pilih foto dari galeri"><Upload size={photoPreview ? 16 : 22} /></button>
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(event) => void selectRequesterPhoto(event)} className="sr-only" />
                  <input ref={galleryInputRef} type="file" accept="image/*" onChange={(event) => void selectRequesterPhoto(event)} className="sr-only" />
              </section>
              {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p> : null}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={closeRequestForm} className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Batal</button><button type="submit" disabled={saving || compressingPhoto} className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Mengirim..." : compressingPhoto ? "Memproses foto..." : "Kirim Permintaan"}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

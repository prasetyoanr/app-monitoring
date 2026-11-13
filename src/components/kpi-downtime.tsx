"use client";

import { useState } from "react";

import type { KpiItem } from "@/data/kpi-mock";
import { downtimeMonth, downtimeWeekEnd } from "@/lib/kpi-downtime";
import { formatNumber } from "@/lib/kpi-score";

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function KpiDowntime({ item, year, canEdit, busy, onSave }: { item: KpiItem; year: number; canEdit: boolean; busy: boolean; onSave: (weekStart: string, hours: number | null) => Promise<void> }) {
  const [weekStart, setWeekStart] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const weeks = item.downtimeWeeks ?? [];

  async function save(start: string, value: number | null) {
    setError(null);
    try { await onSave(start, value); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : "Catatan gagal disimpan."); return false; }
  }

  return (
    <div className="space-y-4 bg-slate-50/80 px-4 py-4 text-xs text-slate-700">
      <div>
        <p className="font-bold text-slate-800">Downtime jaringan · batas {formatNumber(item.target)} jam per minggu</p>
        <p className="mt-1 text-slate-500">Minggu dihitung Senin–Minggu dan dicatat pada bulan hari Minggunya. Nilai bulan adalah rata-rata capaian mingguan; minggu yang melewati batas menurunkan nilai bulan. Data belum lengkap ditampilkan tanpa nilai akhir. Sumber saat ini: input manual.</p>
      </div>
      {canEdit ? <div className="flex flex-wrap items-end gap-2">
        <label className="block">Awal minggu (Senin)<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="mt-1 block h-9 rounded-lg border border-slate-200 bg-white px-2" /></label>
        <label className="block">Jam downtime<input type="number" min="0" max="168" step="0.01" value={hours} onChange={(event) => setHours(event.target.value)} className="mt-1 block h-9 w-28 rounded-lg border border-slate-200 bg-white px-2" placeholder="0 termasuk" /></label>
        <button type="button" disabled={busy} onClick={async () => {
          const end = downtimeWeekEnd(weekStart);
          const value = Number(hours);
          if (!end || Number(end.slice(0, 4)) !== year || hours.trim() === "" || !Number.isFinite(value) || value < 0 || value > 168) { setError("Pilih Senin dari minggu yang berakhir pada tahun pelaporan dan isi jam 0–168."); return; }
          if (await save(weekStart, value)) { setWeekStart(""); setHours(""); }
        }} className="h-9 rounded-lg bg-indigo-600 px-3 font-bold text-white disabled:opacity-50">Simpan minggu</button>
      </div> : null}
      {error ? <p className="text-rose-600">{error}</p> : null}
      {weeks.length ? <div className="flex flex-wrap gap-2">{[...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).map((entry) => <div key={entry.weekStart} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5"><span>{entry.weekStart}–{downtimeWeekEnd(entry.weekStart)}</span><strong>{formatNumber(entry.hours, 2)} jam</strong>{canEdit ? <><button type="button" disabled={busy} onClick={() => { setWeekStart(entry.weekStart); setHours(String(entry.hours)); }} className="font-semibold text-indigo-600">Ubah</button><button type="button" disabled={busy} onClick={() => save(entry.weekStart, null)} className="font-semibold text-rose-600">Hapus</button></> : null}</div>)}</div> : <p className="text-slate-500">Belum ada minggu yang dicatat. Isi 0 jam secara eksplisit jika tidak ada gangguan.</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[590px] text-left"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2">Bulan</th><th className="py-2 text-right">Minggu tercatat</th><th className="py-2 text-right">Akumulasi</th><th className="py-2 text-right">Pemakaian batas</th><th className="py-2 text-right">Capaian KPI</th><th className="py-2 text-right">Nilai berbobot</th></tr></thead><tbody>{months.map((label, index) => { const result = downtimeMonth(year, index + 1, weeks, item.weight, item.target); return <tr key={label} className="border-b border-slate-100"><td className="py-2 font-semibold">{label}</td><td className="py-2 text-right">{result.recorded}/{result.expected}</td><td className="py-2 text-right">{result.recorded ? `${formatNumber(result.hours, 2)} jam` : "—"}</td><td className="py-2 text-right">{result.utilization === null ? "—" : `${formatNumber(result.utilization, 1)}%`}</td><td className="py-2 text-right">{result.achievement === null ? "—" : `${formatNumber(result.achievement, 1)}%`}</td><td className="py-2 text-right font-bold">{formatNumber(result.score, 2)}</td></tr>; })}</tbody></table></div>
    </div>
  );
}

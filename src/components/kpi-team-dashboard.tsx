"use client";

import { useState } from "react";

import { Card, SectionTitle, StatusBadge } from "@/components/ui";
import type { KpiMember } from "@/data/kpi-mock";
import { calculateAchievement, checkpointActual, formatNumber } from "@/lib/kpi-score";
import { downtimeCheckpoint } from "@/lib/kpi-downtime";

export function KpiTeamDashboard({ members, year }: { members: KpiMember[]; year: number }) {
  const [division, setDivision] = useState("all");
  const approved = members.filter((member) => member.status === "approved");
  const divisions = [...new Set(approved.map((member) => member.division))].sort();
  const rows = approved.filter((member) => division === "all" || member.division === division)
    .flatMap((member) => member.items.map((item) => {
      const downtime = item.metricType === "weekly_downtime";
      const actuals = item.source === "survey.satisfaction" ? (item.computedActuals ?? {}) : item.actuals;
      const mid = downtime ? downtimeCheckpoint(year, 6, item.downtimeWeeks ?? [], item.weight, item.target).actual : checkpointActual(item.frequency, item.aggregation, actuals, "mid");
      const endResult = downtime ? downtimeCheckpoint(year, 12, item.downtimeWeeks ?? [], item.weight, item.target) : null;
      const end = downtime ? (endResult?.actual ?? null) : checkpointActual(item.frequency, item.aggregation, actuals, "end");
      return { member, item, mid, end, achievement: downtime ? (endResult?.achievement ?? null) : calculateAchievement(item.polarity, item.target, end) };
    }));
  const complete = rows.filter((row) => row.achievement !== null && row.achievement >= 100).length;
  const needsAttention = rows.filter((row) => row.achievement !== null && row.achievement < 50).length;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="font-bold text-slate-800">Analisis KPI {year}</span>
        <StatusBadge tone="green">{complete} tercapai</StatusBadge>
        <StatusBadge tone={needsAttention ? "red" : "gray"}>{needsAttention} perlu perhatian</StatusBadge>
        <select value={division} onChange={(event) => setDivision(event.target.value)} className="ml-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700" aria-label="Filter divisi">
          <option value="all">Semua divisi</option>
          {divisions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <Card className="mb-5 overflow-hidden">
        <SectionTitle title="KPI anggota yang disetujui" subtitle="Nilai diambil dari realisasi tersimpan. Tanda — berarti belum ada realisasi pada periode tersebut." />
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[12px] text-slate-700">
              <thead><tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"><th className="px-3 py-2">Anggota</th><th className="px-3 py-2">Divisi</th><th className="px-3 py-2">KPI</th><th className="px-3 py-2 text-right">Target</th><th className="px-3 py-2 text-right">Semester I</th><th className="px-3 py-2 text-right">Akhir tahun</th><th className="px-3 py-2 text-right">Capaian</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ member, item, mid, end, achievement }) => <tr key={`${member.id}-${item.id}`} className="hover:bg-slate-50"><td className="px-3 py-3 font-semibold">{member.name}</td><td className="px-3 py-3">{member.division}</td><td className="px-3 py-3">{item.name}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(item.target)} {item.unit}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(mid)} {mid === null ? "" : item.metricType === "weekly_downtime" ? "jam" : item.unit}</td><td className="px-3 py-3 text-right tabular-nums">{formatNumber(end)} {end === null ? "" : item.metricType === "weekly_downtime" ? "jam" : item.unit}</td><td className="px-3 py-3 text-right tabular-nums">{achievement === null ? "—" : `${formatNumber(achievement, 1)}%`}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="px-5 py-8 text-center text-sm text-slate-500">Belum ada KPI yang disetujui untuk pilihan ini.</p>}
      </Card>
    </>
  );
}

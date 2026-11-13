import { Card } from "@/components/ui";
import type { KpiAdapter, KpiItem } from "@/data/kpi-mock";
import { isSmallSurveySample } from "@/lib/survey-metrics";
import {
  entryPeriods,
  describeAchievementRule,
  describeActualRule,
  describeWorkedExample,
  formatNumber,
  frequencyLabel,
  KPI_AGGREGATION_LABELS,
  KPI_PERIOD_CUTOFF_MONTH,
  KPI_PERIOD_LABELS,
  KPI_SCORE_RULE,
  type KpiPeriodKey,
} from "@/lib/kpi-score";

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <div className="space-y-1.5 text-[12px] leading-5 text-slate-600">{children}</div>
    </div>
  );
}

/** Expanded row under a KPI: data source, calculation method, and the numbers behind the score. */
export function KpiItemDetails({
  item,
  adapter,
  actuals,
}: {
  item: KpiItem;
  adapter: KpiAdapter | null;
  actuals: Record<KpiPeriodKey, number | null>;
}) {
  const periods = entryPeriods(item.frequency);
  return (
    <div className="grid gap-5 bg-slate-50/80 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
      <DetailBlock title="Data">
        <p><span className="font-semibold text-slate-700">Data source:</span> {item.dataSource || "-"}</p>
        <p><span className="font-semibold text-slate-700">Value entry:</span> {item.source === "survey.satisfaction" ? "Otomatis dari jawaban survei" : adapter ? `Automatic · ${adapter.label}` : "Manual"}</p>
        <p><span className="font-semibold text-slate-700">Assessed:</span> {frequencyLabel(item.frequency)}</p>
        {item.source === "survey.satisfaction" ? (
          <div>
            <p className="font-semibold text-slate-700">Kepuasan per periode:</p>
            <ul className="mt-1 space-y-1">
              {periods.map((period) => {
                const result = item.surveyEvidence?.[period.endMonth];
                return <li key={period.endMonth} className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                  {period.label}: <strong className="text-slate-800">{item.computedActuals?.[period.endMonth] === undefined ? "—" : `${formatNumber(item.computedActuals[period.endMonth], 1)}%`}</strong>
                  {result ? <span className="block text-[11px] text-slate-500">{result.satisfied}/{result.ratings} rating puas · {result.respondents} responden{isSmallSurveySample(result.respondents) ? " · sampel kecil" : ""}</span> : null}
                </li>;
              })}
            </ul>
            <p className="mt-1 text-[11px] text-slate-500">Rating 4–5 dari pertanyaan instalasi dan perbaikan dihitung puas. Periode tanpa rating belum mendapat nilai.</p>
          </div>
        ) : adapter ? (
          <p>Sumber otomatis belum tersedia untuk indikator ini.</p>
        ) : (
          <div>
            <p className="font-semibold text-slate-700">Actual per period:</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {periods.map((period) => (
                <li key={period.endMonth} className="rounded-md bg-white px-2 py-0.5 tabular-nums ring-1 ring-slate-200">
                  {period.label}: <strong className="text-slate-800">{item.actuals[period.endMonth] === undefined ? "-" : formatNumber(item.actuals[period.endMonth], 2)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DetailBlock>

      <DetailBlock title="Method">
        <p><span className="font-semibold text-slate-700">Metode realisasi:</span> {KPI_AGGREGATION_LABELS[item.aggregation]}</p>
        <p>{describeActualRule(item.aggregation, item.frequency)}</p>
        <p>{describeAchievementRule(item.polarity)}</p>
        <p>{KPI_SCORE_RULE}</p>
        {item.formulaNote ? <p className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200"><span className="font-semibold text-slate-700">Note:</span> {item.formulaNote}</p> : null}
      </DetailBlock>

      <DetailBlock title="Target → Actual → Achievement">
        <p>Target: <strong className="text-slate-800">{formatNumber(item.target, 2)} {item.unit}</strong> for the whole year.</p>
        {(["mid", "end"] as const).map((period) => {
          const example = describeWorkedExample(item.polarity, item.target, item.unit, item.weight, actuals[period]);
          return (
            <p key={period}>
              <span className="font-semibold text-slate-700">{KPI_PERIOD_LABELS[period]}</span>
              <span className="text-slate-400"> (up to {["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][KPI_PERIOD_CUTOFF_MONTH[period]]})</span>
              {": "}
              {example ?? "not scored yet, no actual recorded."}
            </p>
          );
        })}
      </DetailBlock>
    </div>
  );
}

/** Short explanation of how target, actual, achievement, and score relate. */
export function ScoringHelp() {
  return (
    <Card className="mb-5 overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-extrabold text-slate-800 sm:px-5">
          Cara menghitung nilai KPI
          <span className="text-[11px] font-semibold text-indigo-600 group-open:hidden">Tampilkan</span>
          <span className="hidden text-[11px] font-semibold text-indigo-600 group-open:inline">Sembunyikan</span>
        </summary>
        <div className="grid gap-4 border-t border-slate-100 px-4 py-4 text-[12px] leading-5 text-slate-600 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          <div>
            <p className="font-black text-slate-800">1 · Target</p>
            <p>Hasil yang ingin dicapai dalam satu tahun, misalnya kepuasan 90% atau dua sistem selesai dibuat.</p>
          </div>
          <div>
            <p className="font-black text-slate-800">2 · Realisasi</p>
            <p>Hasil yang benar-benar tercapai sampai semester pertama atau akhir tahun. Nilai tiap periode digabungkan sebagai rata-rata, akumulatif, atau nilai terbaru sesuai metode yang dipilih.</p>
            <p className="mt-1"><strong>Akumulatif</strong> menjumlahkan nilai antarperiode: 2 jam + 3 jam = 5 jam. Gunakan untuk jam atau jumlah pekerjaan, bukan untuk menjumlahkan persentase.</p>
            <p className="mt-1">Jika frekuensinya tahunan, masukkan total sampai pertengahan dan akhir tahun secara terpisah; keduanya tidak dijumlahkan kembali.</p>
          </div>
          <div>
            <p className="font-black text-slate-800">3 · Capaian</p>
            <p>Persentase realisasi dibandingkan dengan target.</p>
            <p className="mt-1"><strong>Positif</strong> (lebih tinggi lebih baik): target 90%, realisasi 81% → 81 ÷ 90 = 90%.</p>
            <p className="mt-1"><strong>Lebih sedikit lebih baik</strong>: batas 15 jam, realisasi 18 jam → melampaui batas 20% → capaian 80%. Realisasi 15 jam atau kurang → 100%.</p>
          </div>
          <div>
            <p className="font-black text-slate-800">4 · Nilai</p>
            <p>Capaian × bobot. KPI berbobot 20% dengan capaian 90% menghasilkan 18 poin. Semua poin dijumlahkan menjadi nilai akhir; total bobot harus 100%.</p>
          </div>
        </div>
      </details>
    </Card>
  );
}

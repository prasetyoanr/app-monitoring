"use client";

import { X } from "lucide-react";

import { KPI_ADAPTERS, type KpiAdapter, type KpiItem, type KpiSourceKey } from "@/data/kpi-mock";
import type { KpiSurveyOption } from "@/data/kpi-survey";
import {
  assessmentPeriods,
  checkpointActual,
  entryPeriods,
  clampCustomMonths,
  describeAchievementRule,
  describeActualRule,
  describeWorkedExample,
  frequencyLabel,
  KPI_AGGREGATION_LABELS,
  KPI_CUSTOM_MONTHS_MAX,
  KPI_FREQUENCY_LABELS,
  KPI_KIND_LABELS,
  KPI_PERIOD_CUTOFF_MONTH,
  KPI_SCORE_RULE,
  type KpiActuals,
  type KpiAggregation,
  type KpiFrequency,
  type KpiFrequencyType,
  type KpiKind,
  type KpiPolarity,
} from "@/lib/kpi-score";

const adapterByKey = new Map<string, KpiAdapter>(KPI_ADAPTERS.map((adapter) => [adapter.key, adapter]));

export type Draft = {
  id: string | null;
  objective: string;
  name: string;
  weight: string;
  unit: string;
  target: string;
  frequencyType: KpiFrequencyType;
  customMonths: string;
  aggregation: KpiAggregation;
  polarity: KpiPolarity;
  kind: KpiKind;
  source: KpiSourceKey;
  surveyIds: string[];
  dataSource: string;
  formulaNote: string;
  actuals: Record<number, string>;
};

export const emptyDraft: Draft = {
  id: null,
  objective: "",
  name: "",
  weight: "",
  unit: "%",
  target: "",
  frequencyType: "yearly",
  customMonths: "2",
  aggregation: "average",
  polarity: "positive",
  kind: "routine",
  source: "manual",
  surveyIds: [],
  dataSource: "",
  formulaNote: "",
  actuals: {},
};

export function toDraft(item: KpiItem): Draft {
  return {
    id: item.id,
    objective: item.objective,
    name: item.name,
    weight: String(item.weight),
    unit: item.unit,
    target: String(item.target),
    frequencyType: item.frequency.type,
    customMonths: String(item.frequency.customMonths),
    aggregation: item.aggregation,
    polarity: item.polarity,
    kind: item.kind,
    source: item.source,
    surveyIds: item.surveyIds ?? [],
    dataSource: item.dataSource,
    formulaNote: item.formulaNote,
    actuals: Object.fromEntries(Object.entries(item.actuals).map(([month, value]) => [Number(month), String(value)])),
  };
}

function optionalNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function draftFrequency(draft: Draft): KpiFrequency {
  return { type: draft.frequencyType, customMonths: clampCustomMonths(Number(draft.customMonths)) };
}

function draftActuals(draft: Draft): KpiActuals {
  const actuals: KpiActuals = {};
  if (draft.source !== "manual") return actuals;
  // Only keep values of periods that exist for the chosen frequency.
  for (const period of entryPeriods(draftFrequency(draft))) {
    const value = optionalNumber(draft.actuals[period.endMonth]);
    if (value !== null) actuals[period.endMonth] = value;
  }
  return actuals;
}

export function draftToItem(draft: Draft, existing: KpiItem | undefined): KpiItem {
  return {
    id: draft.id ?? crypto.randomUUID(),
    metricType: existing?.metricType,
    objective: draft.objective.trim(),
    name: draft.name.trim(),
    weight: Number(draft.weight),
    unit: draft.unit.trim() || "%",
    target: Number(draft.target),
    frequency: draftFrequency(draft),
    aggregation: draft.aggregation,
    polarity: draft.polarity,
    kind: draft.kind,
    source: draft.source,
    surveyIds: draft.source === "survey.satisfaction" ? draft.surveyIds : [],
    dataSource: draft.dataSource.trim(),
    formulaNote: draft.formulaNote.trim(),
    actuals: draftActuals(draft),
    attachments: existing?.attachments ?? [],
  };
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="border-b border-slate-100 pb-1 text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">{children}</p>;
}

export function KpiEditor({
  draft,
  surveyOptions,
  onChange,
  onClose,
  onSave,
}: {
  draft: Draft;
  surveyOptions: KpiSurveyOption[];
  onChange: (draft: Draft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const adapter = draft.source === "manual" ? null : (adapterByKey.get(draft.source) ?? null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });
  const frequency = draftFrequency(draft);
  const periods = assessmentPeriods(frequency);
  const customValid =
    draft.frequencyType !== "custom" ||
    (Number.isInteger(Number(draft.customMonths)) && Number(draft.customMonths) >= 1 && Number(draft.customMonths) <= KPI_CUSTOM_MONTHS_MAX);
  const valid =
    draft.name.trim() !== "" &&
    draft.objective.trim() !== "" &&
    Number(draft.weight) > 0 && Number(draft.weight) <= 100 && Number.isFinite(Number(draft.weight)) &&
    Number(draft.target) > 0 && Number.isFinite(Number(draft.target)) &&
    (draft.source !== "survey.satisfaction" || draft.surveyIds.length > 0) &&
    Object.values(draft.actuals).every((value) => value.trim() === "" || (Number.isFinite(Number(value)) && Number(value) >= 0)) &&
    customValid;

  function pickSource(source: KpiSourceKey) {
    const picked = source === "manual" ? null : (adapterByKey.get(source) ?? null);
    onChange({
      ...draft,
      source,
      unit: picked ? picked.unit : draft.unit,
      aggregation: picked ? picked.aggregation : draft.aggregation,
      polarity: source === "survey.satisfaction" ? "positive" : draft.polarity,
      actuals: source === "survey.satisfaction" ? {} : draft.actuals,
      surveyIds: source === "survey.satisfaction" ? draft.surveyIds : [],
    });
  }

  // Preview of the calculation with the numbers typed so far.
  const previewActual = checkpointActual(frequency, draft.aggregation, draftActuals(draft), "end");
  const example = describeWorkedExample(draft.polarity, Number(draft.target), draft.unit, Number(draft.weight), previewActual);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">{draft.id ? "Edit KPI" : "Add KPI"}</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">Define the target, how often it is assessed, and how the result is calculated.</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            <SectionLabel>1 · What to measure</SectionLabel>
            <Field label="Strategic objective">
              <input className={inputClass} value={draft.objective} onChange={(e) => set("objective", e.target.value)} placeholder="e.g. Menjaga Stabilitas Kinerja Karyawan" />
            </Field>
            <Field label="KPI name">
              <textarea className={`${inputClass} h-20 py-2`} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="The indicator being measured" />
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Weight (%)">
                <input className={inputClass} inputMode="decimal" value={draft.weight} onChange={(e) => set("weight", e.target.value)} />
              </Field>
              <Field label="Target" hint="Goal for the whole year.">
                <input className={inputClass} inputMode="decimal" value={draft.target} onChange={(e) => set("target", e.target.value)} />
              </Field>
              <Field label="Unit">
                <input className={inputClass} value={draft.unit} onChange={(e) => set("unit", e.target.value)} disabled={Boolean(adapter)} placeholder="%, Jam, Kali" />
              </Field>
              <Field label="KPI type">
                <select className={inputClass} value={draft.kind} onChange={(e) => set("kind", e.target.value as KpiKind)}>
                  {Object.entries(KPI_KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>2 · How it is assessed</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assessment frequency" hint={`${periods.length} ${periods.length === 1 ? "value" : "values"} per year: ${periods.map((period) => period.label).join(", ")}.`}>
                <select className={inputClass} value={draft.frequencyType} onChange={(e) => set("frequencyType", e.target.value as KpiFrequencyType)}>
                  {Object.entries(KPI_FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              {draft.frequencyType === "custom" ? (
                <Field label="Every how many months?" hint={customValid ? `Whole number from 1 to ${KPI_CUSTOM_MONTHS_MAX}.` : `Enter a whole number from 1 to ${KPI_CUSTOM_MONTHS_MAX}.`}>
                  <input className={inputClass} inputMode="numeric" value={draft.customMonths} onChange={(e) => set("customMonths", e.target.value)} />
                </Field>
              ) : null}
              <Field label="Polaritas" hint="Positif: nilai lebih besar lebih baik. Negatif: nilai lebih kecil lebih baik.">
                <select className={inputClass} value={draft.polarity} onChange={(e) => set("polarity", e.target.value as KpiPolarity)} disabled={draft.source === "survey.satisfaction"}>
                  <option value="positive">Positif</option>
                  <option value="negative">Negatif</option>
                </select>
              </Field>
              <Field label="Metode realisasi" hint={adapter ? "Ditentukan oleh sumber data." : draft.aggregation === "cumulative" && draft.frequencyType === "yearly" ? "Tahunan: isi total sampai titik penilaian; pilih frekuensi bulanan jika ingin menjumlahkan jam per bulan." : draft.aggregation === "cumulative" ? "Jumlahkan nilai setiap periode; gunakan untuk jam atau jumlah pekerjaan." : "Cara menggabungkan nilai dari setiap periode."}>
                <select className={inputClass} value={draft.aggregation} onChange={(e) => set("aggregation", e.target.value as KpiAggregation)} disabled={Boolean(adapter)}>
                  {Object.entries(KPI_AGGREGATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>3 · Where the data comes from</SectionLabel>
            <Field label="Data source" hint="Name the report or document the numbers come from.">
              <input className={inputClass} value={draft.dataSource} onChange={(e) => set("dataSource", e.target.value)} placeholder="e.g. Laporan Survey Triwulanan" />
            </Field>
            <Field label="Calculation note (optional)" hint="Your own description of the formula, shown to reviewers.">
              <input className={inputClass} value={draft.formulaNote} onChange={(e) => set("formulaNote", e.target.value)} placeholder="e.g. (Rata2 Capaian / Target) * 100%" />
            </Field>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <Field label="Value entry" hint={adapter ? adapter.description : "You type the actual of each period yourself. Add attachments as proof."}>
                <select className={inputClass} value={draft.source} onChange={(e) => pickSource(e.target.value as KpiSourceKey)}>
                  <option value="manual">Manual (enter yourself)</option>
                  {surveyOptions.length ? <option value="survey.satisfaction">Survei kepuasan (otomatis)</option> : null}
                </select>
              </Field>

              {draft.source === "survey.satisfaction" ? <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-600">Survei yang dihitung</p>
                {surveyOptions.map((option) => <label key={option.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <input type="checkbox" checked={draft.surveyIds.includes(option.id)} onChange={(event) => set("surveyIds", event.target.checked ? [...draft.surveyIds, option.id] : draft.surveyIds.filter((id) => id !== option.id))} />
                  <span>{option.title}</span>
                </label>)}
                <p className="text-[11px] text-slate-500">Hanya rating kategori instalasi dan perbaikan yang dihitung. Nilai 4–5 dianggap puas.</p>
              </div> : null}

              {adapter ? null : (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Actual per period ({frequencyLabel(frequency)})</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {entryPeriods(frequency).map((period) => (
                      <label key={period.endMonth} className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-600">{period.label}</span>
                        <input
                          className={inputClass}
                          inputMode="decimal"
                          value={draft.actuals[period.endMonth] ?? ""}
                          onChange={(e) => set("actuals", { ...draft.actuals, [period.endMonth]: e.target.value })}
                          placeholder="-"
                        />
                        <span className="mt-0.5 block text-[10px] text-slate-400">
                          {period.endMonth <= KPI_PERIOD_CUTOFF_MONTH.mid ? "Mid-Year + End-Year" : "End-Year"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-[12px] leading-5 text-slate-600 ring-1 ring-slate-200">
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Cara menghitung KPI ini</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>{describeActualRule(draft.aggregation, frequency)}</li>
              <li>{describeAchievementRule(draft.polarity)}</li>
              <li>{KPI_SCORE_RULE}</li>
            </ol>
            <p className="mt-2 rounded-lg bg-white px-3 py-2 font-medium text-slate-700 ring-1 ring-slate-200">
              {example ?? "Isi target, bobot, dan setidaknya satu realisasi untuk melihat contoh perhitungan."}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" disabled={!valid} onClick={onSave} className="h-10 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">Save KPI</button>
        </div>
      </div>
    </div>
  );
}

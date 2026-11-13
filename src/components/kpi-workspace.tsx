"use client";

import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Link2,
  Lock,
  Paperclip,
  Pencil,
  Plus,
  LayoutDashboard,
  Scale,
  Send,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

import { addKpiLinkAction, removeKpiAttachmentAction, requestKpiChangesAction, reviewKpiAction, saveKpiDowntimeWeekAction, saveKpiItemsAction, submitKpiAction } from "@/app/kpi/actions";

import { KpiItemDetails, ScoringHelp } from "@/components/kpi-details";
import { KpiEditor, draftToItem, emptyDraft, toDraft, type Draft } from "@/components/kpi-editor";
import { KpiAttachmentDialog } from "@/components/kpi-attachment-dialog";
import { KpiTeamDashboard } from "@/components/kpi-team-dashboard";
import { KpiDowntime } from "@/components/kpi-downtime";
import type { KpiSurveyOption } from "@/data/kpi-survey";
import { Card, MetricCard, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import {
  KPI_ADAPTERS,
  type KpiAdapter,
  type KpiItem,
  type KpiMember,
} from "@/data/kpi-mock";
import {
  calculateAchievement,
  calculateWeightedScore,
  checkpointActual,
  frequencyLabel,
  formatNumber,
  KPI_AGGREGATION_LABELS,
  KPI_KIND_LABELS,
  KPI_PERIOD_LABELS,
  KPI_PERIOD_CUTOFF_MONTH,
  scoreTone,
  type KpiPeriodKey,
} from "@/lib/kpi-score";
import { downtimeCheckpoint } from "@/lib/kpi-downtime";
import { isSmallSurveySample } from "@/lib/survey-metrics";
import {
  canEditScorecard,
  canReviewScorecard,
  KPI_ROLE_LABELS,
  requiredApproverRole,
  KPI_STATUS_LABELS,
  submitScorecard,
} from "@/lib/kpi-approval";

const adapterByKey = new Map<string, KpiAdapter>(
  KPI_ADAPTERS.map((adapter) => [adapter.key, adapter]),
);

function resolveActual(item: KpiItem, period: KpiPeriodKey) {
  return checkpointActual(item.frequency, item.aggregation, item.source === "survey.satisfaction" ? (item.computedActuals ?? {}) : item.actuals, period);
}

function evaluate(item: KpiItem, period: KpiPeriodKey, year: number) {
  if (item.metricType === "weekly_downtime") return downtimeCheckpoint(year, period === "mid" ? 6 : 12, item.downtimeWeeks ?? [], item.weight, item.target);
  const actual = resolveActual(item, period);
  const achievement = calculateAchievement(item.polarity, item.target, actual);
  return {
    actual,
    achievement,
    score: calculateWeightedScore(item.weight, achievement),
  };
}

function summarize(items: KpiItem[], year: number) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const total = (period: KpiPeriodKey) => {
    const scores = items.map((item) => evaluate(item, period, year).score);
    return scores.length > 0 && scores.every((score) => score !== null)
      ? scores.reduce<number>((sum, score) => sum + (score ?? 0), 0)
      : null;
  };
  return { totalWeight, mid: total("mid"), end: total("end") };
}

function PeriodCells({ item, period, year }: { item: KpiItem; period: KpiPeriodKey; year: number }) {
  const { actual, achievement, score } = evaluate(item, period, year);
  const cutoff = KPI_PERIOD_CUTOFF_MONTH[period];
  const respondents = item.source !== "survey.satisfaction" ? 0 : item.frequency.type === "yearly" ? (item.surveyEvidence?.[cutoff]?.respondents ?? 0) : Object.entries(item.surveyEvidence ?? {}).reduce((total, [month, evidence]) => total + (Number(month) <= cutoff ? evidence.respondents : 0), 0);
  return (
    <>
      <td className="px-3 py-3 text-right tabular-nums">
        {actual === null ? <span className="text-slate-300">-</span> : `${formatNumber(actual)} ${item.metricType === "weekly_downtime" ? "jam" : item.unit}`}
        {respondents > 0 ? <span className="block text-[10px] text-slate-500">{respondents} responden{isSmallSurveySample(respondents) ? " · sampel kecil" : ""}</span> : null}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {achievement === null ? <span className="text-slate-300">-</span> : <StatusBadge tone={scoreTone(achievement)}>{formatNumber(achievement, 0)}%</StatusBadge>}
      </td>
      <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-800">{formatNumber(score, 2)}</td>
    </>
  );
}

type View = "mine" | "review" | "all" | "dashboard";

const statusTone = { draft: "gray", submitted: "blue", approved: "green", rejected: "red" } as const;

function MemberList({
  members,
  year,
  selectedId,
  onSelect,
  title,
  subtitle,
}: {
  members: KpiMember[];
  year: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <Card className="mb-5 overflow-hidden">
      <SectionTitle title={title} subtitle={subtitle} />
      {members.length === 0 ? (
        <p className="px-5 py-8 text-center text-[12px] text-slate-500">No KPIs to review yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {members.map((entry) => {
            const stats = summarize(entry.items, year);
            return (
              <button key={entry.id} type="button" onClick={() => onSelect(entry.id)} className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left transition sm:grid-cols-[1.5fr_1.2fr_repeat(3,5.5rem)] sm:px-5 ${entry.id === selectedId ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{entry.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{entry.division} · {KPI_ROLE_LABELS[entry.role]}</p>
                </div>
                <div className="hidden sm:block">
                  <StatusBadge tone={statusTone[entry.status]}>{KPI_STATUS_LABELS[entry.status]}</StatusBadge>
                </div>
                <div className="hidden text-right text-[12px] tabular-nums sm:block">
                  <span className={stats.totalWeight === 100 ? "text-slate-600" : "font-bold text-rose-600"}>{stats.totalWeight}%</span>
                  <span className="block text-[10px] text-slate-400">weight</span>
                </div>
                <div className="hidden text-right text-[12px] tabular-nums text-slate-600 sm:block">
                  {formatNumber(stats.mid, 1)}
                  <span className="block text-[10px] text-slate-400">Mid-Year</span>
                </div>
                <div className="text-right text-[12px] tabular-nums text-slate-600">
                  {formatNumber(stats.end, 1)}
                  <span className="block text-[10px] text-slate-400">End-Year</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function KpiWorkspace({ initialMembers, surveyOptions, currentUserId, isAdministrator, year }: { initialMembers: KpiMember[]; surveyOptions: KpiSurveyOption[]; currentUserId: string; isAdministrator: boolean; year: number }) {
  const router = useRouter();
  const [members, setMembers] = useState<KpiMember[]>(initialMembers);
  const [view, setView] = useState<View>(isAdministrator ? "all" : "mine");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [attachmentItemId, setAttachmentItemId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = isAdministrator;
  const me = members.find((entry) => entry.id === currentUserId) ?? null;
  const reviewQueue = me ? members.filter((entry) => canReviewScorecard(me, entry)) : [];
  const pendingCount = reviewQueue.filter((entry) => entry.status === "submitted").length;

  const tabs: [View, string, typeof Target][] = isAdmin
    ? [["all", "All Members", Users], ["dashboard", "KPI Analysis", LayoutDashboard]]
    : me && (me.role === "approver" || me.role === "final_approver")
      ? [["mine", "My KPI", Target], ["review", "Approvals", ClipboardCheck]]
      : [["mine", "My KPI", Target]];
  const activeView: View = tabs.some(([key]) => key === view) ? view : tabs[0][0];

  const list = activeView === "review" ? reviewQueue : members;
  const member =
    activeView === "mine"
      ? me
      : activeView === "dashboard"
        ? null
        : (list.find((entry) => entry.id === selectedId) ?? list[0] ?? null);

  const items = member?.items ?? [];
  const attachmentItem = items.find((entry) => entry.id === attachmentItemId) ?? null;
  const manualItems = items.filter((entry) => entry.source === "manual");
  const manualWithAttachment = manualItems.filter((entry) => entry.attachments.length > 0).length;
  const summary = summarize(items, year);
  const weightOk = summary.totalWeight === 100;
  const approverRole = member ? requiredApproverRole(member.role) : null;
  const approverLabel = approverRole ? KPI_ROLE_LABELS[approverRole] : "-";
  const isOwner = Boolean(me && member && me.id === member.id);
  const editable = Boolean(isOwner && member && canEditScorecard(member.role, member.status));
  const canReview = Boolean(me && member && canReviewScorecard(me, member));

  async function runMutation(action: () => Promise<KpiMember>) {
    if (busy) throw new Error("Tunggu sampai penyimpanan sebelumnya selesai.");
    setBusy(true);
    try {
      const updated = await action();
      setMembers((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setNotice(null);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "KPI gagal disimpan.");
      throw cause;
    } finally {
      setBusy(false);
    }
  }

  async function updateItems(update: (current: KpiItem[]) => KpiItem[]) {
    if (!member) return;
    await runMutation(() => saveKpiItemsAction(year, member.revision ?? 0, update(items)));
  }

  async function saveDraft() {
    if (!draft) return;
    const item = draftToItem(draft, items.find((entry) => entry.id === draft.id));
    try {
      await updateItems((current) => draft.id ? current.map((entry) => entry.id === draft.id ? item : entry) : [...current, item]);
      setDraft(null);
    } catch { /* Keep the editor open so the member can correct the input. */ }
  }

  async function submit() {
    if (!member) return;
    const result = submitScorecard(member.role, items.length, summary.totalWeight);
    if (!result.ok) {
      setNotice(result.reason);
      return;
    }
    try { await runMutation(() => submitKpiAction(year, member.revision ?? 0)); } catch { /* Shown above. */ }
  }

  async function decide(approve: boolean) {
    if (!me || !member || !canReview) return;
    if (!approve && reviewText.trim() === "") {
      setNotice("Add a reason so the member knows what to fix.");
      return;
    }
    try {
      await runMutation(() => reviewKpiAction(member.id, year, member.revision ?? 0, approve, reviewText));
      setReviewText("");
    } catch { /* Shown above. */ }
  }

  const titles: Record<View, [string, string]> = {
    mine: ["My KPI", "Buat indikator, isi realisasi, dan ajukan KPI untuk disetujui."],
    review: ["KPI Approvals", "Review the KPIs your role must approve (GA and IT), then approve or reject with a note."],
    all: ["All Members' KPI", "See every member's KPIs together with their approval status."],
    dashboard: ["Team KPI Analysis", "Trends and status of KPIs across members and functions."],
  };

  return (
    <>
      <PageHeader
        eyebrow="KPI"
        title={titles[activeView][0]}
        description={titles[activeView][1]}
        action={activeView === "mine" && isOwner ? (
          <button
            type="button"
            disabled={!editable}
            title={editable ? undefined : "Locked while pending or after approval. Ask for changes first."}
            onClick={() => setDraft({ ...emptyDraft })}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Plus className="size-4" /> Add KPI
          </button>
        ) : undefined}
      />

      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
        <label htmlFor="kpi-year">Tahun penilaian</label>
        <select id="kpi-year" value={year} onChange={(event) => router.push(`/kpi?year=${event.target.value}`)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800">
          {[year - 1, year, year + 1].filter((value) => value >= 2020 && value <= 2100).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {tabs.length > 1 ? (
        <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 text-sm font-bold">
          {tabs.map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => { setView(key); setNotice(null); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${activeView === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <Icon className="size-3.5" /> {label}
              {key === "review" && pendingCount > 0 ? <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{pendingCount}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {activeView === "dashboard" ? <KpiTeamDashboard members={members} year={year} /> : null}

      {activeView === "all" || activeView === "review" ? (
        <MemberList
          members={list}
          year={year}
          selectedId={member?.id ?? null}
          onSelect={(id) => { setSelectedId(id); setReviewText(""); setNotice(null); }}
          title={activeView === "all" ? "All members" : "Waiting for your review"}
          subtitle={activeView === "all" ? "Select a member to see their scorecard." : "KPIs your role needs to review, for both GA and IT."}
        />
      ) : null}

      {member ? (
        <>
          <Card className="mb-5 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone[member.status]}>{KPI_STATUS_LABELS[member.status]}</StatusBadge>
                  <span className="text-[12px] font-bold text-slate-700">{member.name}</span>
                  <span className="text-[11px] text-slate-400">{member.division} · {KPI_ROLE_LABELS[member.role]}</span>
                </div>
                <p className="mt-2 text-[12px] leading-5 text-slate-600">
                  {member.role === "final_approver"
                    ? "Final Approval has full authority over their own KPIs. Changes take effect immediately without approval."
                    : member.status === "draft"
                      ? `Still a draft. Once submitted, it is reviewed by ${approverLabel} (for both GA and IT).`
                      : member.status === "submitted"
                        ? `Waiting for ${approverLabel} approval. KPIs are locked while under review.`
                        : member.status === "approved"
                          ? `Approved by ${member.reviewedBy ?? approverLabel}. KPIs are locked; changes need approval again.`
                          : `Rejected by ${member.reviewedBy ?? approverLabel}. Fix the issues and submit again.`}
                </p>
                {member.reviewNote ? (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600 ring-1 ring-slate-200">
                    <strong className="text-slate-700">Reviewer note:</strong> {member.reviewNote}
                  </p>
                ) : null}
                {manualItems.length > 0 ? (
                  <p className={`mt-2 text-[11px] ${manualWithAttachment === manualItems.length ? "text-emerald-600" : "text-amber-600"}`}>
                    Attachments added to {manualWithAttachment} of {manualItems.length} manual KPIs.
                  </p>
                ) : null}
                {!isOwner && !canReview ? (
                  <p className="mt-2 text-[11px] text-slate-400">
                    {isAdmin ? "Administrators have view-only access. " : ""}Approval is done by {approverLabel}.
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {isOwner && editable && member.role !== "final_approver" ? (
                  <button type="button" disabled={busy} onClick={submit} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                    <Send className="size-4" /> {member.status === "rejected" ? "Resubmit" : "Submit for approval"}
                  </button>
                ) : null}
                {isOwner && member.role !== "final_approver" && member.status === "approved" ? (
                  <button type="button" disabled={busy} onClick={async () => { try { await runMutation(() => requestKpiChangesAction(year, member.revision ?? 0)); } catch { /* Shown above. */ } }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <Pencil className="size-4" /> Request changes
                  </button>
                ) : null}
              </div>
            </div>

            {canReview && member.status === "submitted" ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Reviewer note (required to reject)</span>
                  <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} className="h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" placeholder="e.g. Target is too low, please add an attachment." />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => decide(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                    <Check className="size-4" /> Approve
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(false)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50">
                    <X className="size-4" /> Reject
                  </button>
                </div>
              </div>
            ) : null}

            {notice ? <p className="mt-3 text-[12px] font-bold text-rose-600">{notice}</p> : null}
          </Card>

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard compactOnMobile label="Total weight" value={`${summary.totalWeight}%`} icon={Scale} tone={weightOk ? "green" : "red"} detail={weightOk ? "Weight is 100%." : "Total weight must be 100%."} />
            <MetricCard compactOnMobile label="Mid-Year score" value={formatNumber(summary.mid, 1)} icon={TrendingUp} tone="blue" detail="Total weighted final score." />
            <MetricCard compactOnMobile label="End-Year score" value={formatNumber(summary.end, 1)} icon={TrendingUp} tone="teal" detail="Not scored yet if empty." />
            <MetricCard compactOnMobile label="KPI manual" value={`${items.length}`} icon={Link2} tone="amber" detail="Realisasi diisi oleh pemilik KPI." />
          </div>

          <ScoringHelp />


          <Card className="overflow-hidden">
            <SectionTitle
              title={`Individual scorecard · ${member.name}`}
              subtitle={`${member.division} · ${member.position}`}
              action={!weightOk ? <StatusBadge tone="red">Weight {summary.totalWeight}% (must be 100%)</StatusBadge> : <StatusBadge tone="green">Weight 100%</StatusBadge>}
            />

            {items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Target className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No KPIs yet</p>
                <p className="mt-1 text-[12px] text-slate-500">{editable ? "Add your first KPI to get started." : "This member has not set up KPIs yet."}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-[12px] text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <th rowSpan={2} className="px-3 py-2">No</th>
                      <th rowSpan={2} className="px-3 py-2">Strategic objective</th>
                      <th rowSpan={2} className="px-3 py-2">KPI</th>
                      <th rowSpan={2} className="px-3 py-2 text-right">Weight</th>
                      <th rowSpan={2} className="px-3 py-2 text-right">Target</th>
                      <th rowSpan={2} className="px-3 py-2">Frequency / type</th>
                      <th rowSpan={2} className="px-3 py-2">Polarity</th>
                      <th colSpan={3} className="border-l border-slate-200 px-3 py-2 text-center">{KPI_PERIOD_LABELS.mid}</th>
                      <th colSpan={3} className="border-l border-slate-200 px-3 py-2 text-center">{KPI_PERIOD_LABELS.end}</th>
                      <th rowSpan={2} className="px-3 py-2" />
                    </tr>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                      {(["mid", "end"] as const).flatMap((period) => [
                        <th key={`${period}-a`} className="border-l border-slate-200 px-3 py-1.5 text-right">Actual</th>,
                        <th key={`${period}-b`} className="px-3 py-1.5 text-right">Achievement</th>,
                        <th key={`${period}-c`} className="px-3 py-1.5 text-right">Score</th>,
                      ])}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => {
                      const adapter = item.source === "manual" ? null : adapterByKey.get(item.source);
                      return (
                        <Fragment key={item.id}>
                        <tr className="align-top hover:bg-slate-50/60">
                          <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                          <td className="max-w-[200px] px-3 py-3 font-medium text-slate-800">{item.objective}</td>
                          <td className="max-w-[280px] px-3 py-3">
                            <p className="leading-5 text-slate-800">{item.name}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {adapter ? (
                                <StatusBadge tone="blue"><Link2 className="size-3" /> Automatic · {adapter.label}</StatusBadge>
                              ) : (
                                <StatusBadge tone="gray">Manual</StatusBadge>
                              )}
                              <StatusBadge tone={item.kind === "routine" ? "gray" : "amber"}>{KPI_KIND_LABELS[item.kind]}</StatusBadge>
                              <button
                                type="button"
                                onClick={() => setAttachmentItemId(item.id)}
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ring-inset transition hover:brightness-95 ${
                                  item.attachments.length > 0
                                    ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
                                    : item.source === "manual"
                                      ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                                      : "bg-slate-100 text-slate-600 ring-slate-500/15"
                                }`}
                              >
                                <Paperclip className="size-3" />
                                {item.attachments.length > 0 ? `${item.attachments.length} ${item.attachments.length === 1 ? "attachment" : "attachments"}` : isOwner ? "Add attachment" : "No attachments"}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums">{item.weight}%</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(item.target)} {item.unit}</td>
                          <td className="px-3 py-3">{frequencyLabel(item.frequency)}<span className="block text-[10px] text-slate-400">{KPI_AGGREGATION_LABELS[item.aggregation]}</span></td>
                          <td className="px-3 py-3">{item.polarity === "positive" ? "Positif" : "Negatif"}</td>
                          <PeriodCells item={item} period="mid" year={year} />
                          <PeriodCells item={item} period="end" year={year} />
                          <td className="whitespace-nowrap px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                              className="mr-1 inline-grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label={expandedId === item.id ? "Hide details" : "Show details"}
                              aria-expanded={expandedId === item.id}
                            >
                              <ChevronDown className={`size-4 transition ${expandedId === item.id ? "rotate-180" : ""}`} />
                            </button>
                            {editable && item.metricType !== "weekly_downtime" ? (
                              <>
                                <button type="button" onClick={() => setDraft(toDraft(item))} className="mr-1 inline-grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label="Edit KPI">
                                  <Pencil className="size-3.5" />
                                </button>
                                <button type="button" disabled={busy} onClick={async () => { try { await updateItems((current) => current.filter((entry) => entry.id !== item.id)); } catch { /* Shown above. */ } }} className="inline-grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete KPI">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </>
                            ) : (
                              <Lock className="inline size-3.5 align-middle text-slate-300" aria-label="Locked" />
                            )}
                          </td>
                        </tr>
                        {expandedId === item.id ? (
                          <tr>
                            <td colSpan={14} className="p-0">
                              {item.metricType === "weekly_downtime" ? <KpiDowntime item={item} year={year} canEdit={isOwner} busy={busy} onSave={(weekStart, hours) => runMutation(() => saveKpiDowntimeWeekAction(year, item.id, weekStart, hours))} /> : <KpiItemDetails item={item} adapter={adapter ?? null} actuals={{ mid: evaluate(item, "mid", year).actual, end: evaluate(item, "end", year).actual }} />}
                            </td>
                          </tr>
                        ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/60 font-bold text-slate-800">
                      <td colSpan={3} className="px-3 py-3">Total score</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${weightOk ? "" : "text-rose-600"}`}>{summary.totalWeight}%</td>
                      <td colSpan={4} />
                      <td colSpan={2} className="px-3 py-3 text-right">Total final score</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(summary.mid, 2)}</td>
                      <td colSpan={2} className="px-3 py-3 text-right">Total final score</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(summary.end, 2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            Akumulatif menjumlahkan nilai antarperiode. Polaritas positif menilai realisasi yang lebih besar sebagai lebih baik; polaritas negatif menilai realisasi yang lebih kecil sebagai lebih baik. Nilai KPI = capaian × bobot.
          </p>
        </>
      ) : null}

      {attachmentItem ? (
        <KpiAttachmentDialog
          key={attachmentItem.id}
          item={attachmentItem}
          canAdd={editable}
          canRemove={editable}
          onAddLink={async (title, url) => { await runMutation(() => addKpiLinkAction(year, attachmentItem.id, member?.revision ?? 0, title, url)); }}
          onAddFile={async (title, file) => {
            const form = new FormData();
            form.set("file", file);
            form.set("title", title);
            form.set("itemId", attachmentItem.id);
            form.set("year", String(year));
            form.set("revision", String(member?.revision ?? 0));
            const response = await fetch("/kpi/files", { method: "POST", body: form });
            if (!response.ok) throw new Error(await response.text());
            window.location.reload();
          }}
          onRemove={async (attachmentId) => { await runMutation(() => removeKpiAttachmentAction(year, attachmentItem.id, attachmentId, member?.revision ?? 0)); }}
          onClose={() => setAttachmentItemId(null)}
        />
      ) : null}

      {draft ? (
        <KpiEditor draft={draft} surveyOptions={surveyOptions} onChange={setDraft} onClose={() => setDraft(null)} onSave={saveDraft} />
      ) : null}
    </>
  );
}

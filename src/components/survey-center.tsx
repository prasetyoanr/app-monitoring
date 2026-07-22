"use client";

import {
  BarChart3,
  Check,
  CircleAlert,
  CircleCheckBig,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  FileClock,
  Files,
  LoaderCircle,
  MessageSquareText,
  Network,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  Star,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  deleteSurveyAction,
  duplicateSurveyAction,
  getSurveyResponsesAction,
  retrySurveyResponseAnalysisAction,
  setSurveyStatusAction,
} from "@/app/surveys/actions";
import { Card, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import type {
  SurveyAnswerValue,
  SurveyAnswerAnalysisRecord,
  SurveyDisplayStatus,
  SurveyKpiCategory,
  SurveyListRecord,
  SurveyQuestionRecord,
  SurveyResponseData,
  SurveySubmissionRecord,
} from "@/data/survey-types";
import {
  calculateSurveyRatingMetrics,
  SURVEY_KPI_CATEGORIES,
  SURVEY_SATISFACTION_TARGET,
} from "@/lib/survey-metrics";

function statusTone(status: SurveyDisplayStatus) {
  if (status === "active") return "green" as const;
  if (status === "draft") return "amber" as const;
  if (status === "expired") return "red" as const;
  return "gray" as const;
}

function statusLabel(status: SurveyDisplayStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function answerText(value: SurveyAnswerValue | undefined) {
  if (value === undefined) return "No answer";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function answerFor(
  submission: SurveySubmissionRecord,
  questionId: string,
) {
  return submission.answers.find((answer) => answer.questionId === questionId)?.value;
}

function analysisFor(
  submission: SurveySubmissionRecord,
  questionId: string,
) {
  return submission.answers.find((answer) => answer.questionId === questionId)
    ?.analysis;
}

function sentimentLabel(analysis: SurveyAnswerAnalysisRecord | null | undefined) {
  if (!analysis) return "Not analyzed";
  if (analysis.status === "pending") return "Analyzing";
  if (analysis.status === "failed") return "Analysis failed";
  const labels = {
    very_positive: "Very Positive",
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
    very_negative: "Very Negative",
    not_applicable: "Not Applicable",
  };
  return analysis.label ? labels[analysis.label] : "Not analyzed";
}

function sentimentClass(analysis: SurveyAnswerAnalysisRecord | null | undefined) {
  if (analysis?.status === "pending") return "bg-blue-50 text-blue-700";
  if (analysis?.status === "failed") return "bg-rose-50 text-rose-700";
  if (analysis?.label === "very_positive" || analysis?.label === "positive") return "bg-emerald-50 text-emerald-700";
  if (analysis?.label === "negative" || analysis?.label === "very_negative") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function responseAiStatus(
  submission: SurveySubmissionRecord,
  questions: SurveyQuestionRecord[],
) {
  const analyzableQuestionIds = new Set(
    questions
      .filter(
        (question) =>
          question.type === "short_answer" || question.type === "paragraph",
      )
      .map((question) => question.id),
  );
  const status = { total: 0, completed: 0, pending: 0, failed: 0, missing: 0 };
  for (const answer of submission.answers) {
    if (!analyzableQuestionIds.has(answer.questionId)) continue;
    status.total += 1;
    if (!answer.analysis) status.missing += 1;
    else status[answer.analysis.status] += 1;
  }
  return status;
}

function QuestionSummary({
  question,
  submissions,
}: {
  question: SurveyQuestionRecord;
  submissions: SurveySubmissionRecord[];
}) {
  const values = submissions
    .map((submission) => answerFor(submission, question.id))
    .filter((value): value is SurveyAnswerValue => value !== undefined);

  if (question.type === "linear_scale") {
    const numbers = values.filter((value): value is number => typeof value === "number");
    const metrics = calculateSurveyRatingMetrics(numbers);
    return (
      <div className="mt-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Average Rating</p>
            <div className="mt-1 flex items-end gap-2"><span className="text-3xl font-black tracking-tight text-indigo-700">{metrics.averageRating.toFixed(1)}</span><span className="pb-1 text-[11px] text-slate-400">/ 5 from {metrics.responseCount} answers</span></div>
            <div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((score) => <Star key={score} size={17} className={score <= Math.round(metrics.averageRating) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}</div>
          </div>
          <div className="min-w-40 rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Satisfaction Score</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{metrics.responseCount ? `${Math.round(metrics.satisfactionScore)}%` : "—"}</p>
            <p className="mt-1 text-[9px] font-semibold text-emerald-700/75">Ratings 4–5 · target {SURVEY_SATISFACTION_TARGET}% · achievement {Math.round(metrics.targetAchievement)}%</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((score) => {
            const total = metrics.ratings.filter((value) => value === score).length;
            return <div key={score} className="rounded-xl bg-slate-50 p-2 text-center"><Star size={13} className="mx-auto fill-amber-400 text-amber-400" /><p className="mt-1 text-[9px] font-bold text-slate-500">{score} / 5</p><p className="mt-1 text-sm font-black text-slate-800">{total}</p></div>;
          })}
        </div>
      </div>
    );
  }

  if (["multiple_choice", "checkboxes", "dropdown"].includes(question.type)) {
    const counts = new Map<string, number>();
    for (const value of values) {
      const selected = Array.isArray(value) ? value : [String(value)];
      for (const item of selected) counts.set(item, (counts.get(item) ?? 0) + 1);
    }
    const maximum = Math.max(1, ...counts.values());
    return <div className="mt-4 space-y-2">{question.options.map((option) => { const total = counts.get(option) ?? 0; return <div key={option}><div className="mb-1 flex justify-between gap-3 text-[10px]"><span className="truncate font-semibold text-slate-600">{option}</span><span className="font-bold text-slate-500">{total}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${(total / maximum) * 100}%` }} /></div></div>; })}</div>;
  }

  const textEntries = submissions.flatMap((submission) => {
    const answer = submission.answers.find(
      (item) => item.questionId === question.id,
    );
    return answer ? [{ value: answer.value, analysis: answer.analysis }] : [];
  });
  return (
    <div className="mt-4 space-y-2">
      {textEntries.slice(0, 3).map((entry, index) => <div key={index} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] leading-5 text-slate-600">{answerText(entry.value)}</p><span className={`mt-2 inline-flex rounded-md px-2 py-1 text-[9px] font-bold ${sentimentClass(entry.analysis)}`}>Gemini AI · {sentimentLabel(entry.analysis)}{entry.analysis?.confidencePercent !== null && entry.analysis?.confidencePercent !== undefined ? ` · ${entry.analysis.confidencePercent}%` : ""}</span></div>)}
      {textEntries.length === 0 ? <p className="text-[11px] text-slate-400">No answers yet.</p> : null}
      {textEntries.length > 3 ? <p className="text-[10px] font-semibold text-indigo-600">+ {textEntries.length - 3} more answers</p> : null}
    </div>
  );
}

export function SurveyCenter({
  surveys,
  canManage,
}: {
  surveys: SurveyListRecord[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"history" | "responses">("history");
  const [selectedSurveyId, setSelectedSurveyId] = useState(surveys[0]?.id ?? "");
  const [responseData, setResponseData] = useState<SurveyResponseData | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<SurveySubmissionRecord | null>(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [deleteRecord, setDeleteRecord] = useState<SurveyListRecord | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "info">("error");
  const [copiedCode, setCopiedCode] = useState("");

  async function loadResponses(surveyId: string) {
    if (!surveyId) return;
    setLoadingResponses(true);
    setMessage("");
    const result = await getSurveyResponsesAction(surveyId);
    setLoadingResponses(false);
    if (result.ok) setResponseData(result.data);
    else {
      setMessageTone("error");
      setMessage(result.error);
    }
  }

  function openResponses() {
    setTab("responses");
    void loadResponses(selectedSurveyId);
  }

  function selectSurvey(surveyId: string) {
    setSelectedSurveyId(surveyId);
    void loadResponses(surveyId);
  }

  const totals = useMemo(() => ({
    forms: surveys.length,
    active: surveys.filter((survey) => survey.status === "active").length,
    responses: surveys.reduce((sum, survey) => sum + survey.responseCount, 0),
  }), [surveys]);

  const ratingMetrics = useMemo(() => {
    if (!responseData) return calculateSurveyRatingMetrics([]);
    const scaleIds = new Set(responseData.questions.filter((question) => question.type === "linear_scale").map((question) => question.id));
    const ratings = responseData.submissions.flatMap((submission) => submission.answers.filter((answer) => scaleIds.has(answer.questionId) && typeof answer.value === "number").map((answer) => answer.value as number));
    return calculateSurveyRatingMetrics(ratings);
  }, [responseData]);

  const kpiMetrics = useMemo(() => {
    if (!responseData) return [];
    return (Object.entries(SURVEY_KPI_CATEGORIES) as Array<[
      SurveyKpiCategory,
      (typeof SURVEY_KPI_CATEGORIES)[SurveyKpiCategory],
    ]>).flatMap(([category, definition]) => {
      const questionIds = new Set(
        responseData.questions
          .filter(
            (question) =>
              question.type === "linear_scale" &&
              question.kpiCategory === category,
          )
          .map((question) => question.id),
      );
      if (!questionIds.size) return [];
      const values = responseData.submissions.flatMap((submission) =>
        submission.answers
          .filter((answer) => questionIds.has(answer.questionId))
          .map((answer) => answer.value),
      );
      return [{ category, definition, metrics: calculateSurveyRatingMetrics(values) }];
    });
  }, [responseData]);

  const aiMetrics = useMemo(() => {
    if (!responseData) return { positivePercent: 0, analyzed: 0 };
    const textQuestionIds = new Set(
      responseData.questions
        .filter(
          (question) =>
            question.type === "short_answer" ||
            question.type === "paragraph",
        )
        .map((question) => question.id),
    );
    const analyses = responseData.submissions.flatMap((submission) =>
      submission.answers
        .filter((answer) => textQuestionIds.has(answer.questionId))
        .map((answer) => answer.analysis)
        .filter(
          (analysis): analysis is SurveyAnswerAnalysisRecord =>
            Boolean(
              analysis &&
                analysis.status === "completed" &&
                analysis.label !== "not_applicable",
            ),
        ),
    );
    const positive = analyses.filter((analysis) => analysis.label === "positive" || analysis.label === "very_positive").length;
    return {
      positivePercent: analyses.length ? Math.round((positive / analyses.length) * 100) : 0,
      analyzed: analyses.length,
    };
  }, [responseData]);

  const aiStatus = useMemo(() => {
    const total = { total: 0, completed: 0, pending: 0, failed: 0, missing: 0 };
    if (!responseData) return total;
    for (const submission of responseData.submissions) {
      const status = responseAiStatus(submission, responseData.questions);
      total.total += status.total;
      total.completed += status.completed;
      total.pending += status.pending;
      total.failed += status.failed;
      total.missing += status.missing;
    }
    return total;
  }, [responseData]);

  const selectedResponseAiStatus = useMemo(
    () =>
      selectedResponse && responseData
        ? responseAiStatus(selectedResponse, responseData.questions)
        : null,
    [responseData, selectedResponse],
  );

  async function copyLink(survey: SurveyListRecord) {
    const url = `${window.location.origin}/s/${survey.publicCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(survey.publicCode);
      window.setTimeout(() => setCopiedCode(""), 1800);
    } catch {
      setMessageTone("error");
      setMessage("Unable to copy the link. Copy it from the preview page.");
    }
  }

  async function changeStatus(survey: SurveyListRecord) {
    setPendingId(survey.id);
    setMessage("");
    const status = survey.storedStatus === "active" ? "closed" : "active";
    const result = await setSurveyStatusAction(survey.id, status);
    setPendingId("");
    if (!result.ok) {
      setMessageTone("error");
      setMessage(result.error);
    }
    else router.refresh();
  }

  async function duplicateSurvey(survey: SurveyListRecord) {
    setPendingId(survey.id);
    setMessage("");
    const result = await duplicateSurveyAction(survey.id);
    setPendingId("");
    if (!result.ok) {
      setMessageTone("error");
      setMessage(result.error);
      return;
    }
    setMessageTone("info");
    setMessage(`${result.data.title} was created as a new draft with separate responses.`);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteRecord) return;
    setPendingId(deleteRecord.id);
    const result = await deleteSurveyAction(deleteRecord.id);
    setPendingId("");
    if (!result.ok) {
      setMessageTone("error");
      setMessage(result.error);
    }
    else {
      setDeleteRecord(null);
      router.refresh();
    }
  }

  async function retryAnalysis(submission: SurveySubmissionRecord) {
    if (!responseData) return;
    const pendingKey = `ai:${submission.id}`;
    setPendingId(pendingKey);
    setMessage("");
    const result = await retrySurveyResponseAnalysisAction(
      responseData.surveyId,
      submission.id,
    );
    setPendingId("");
    if (!result.ok) {
      setMessageTone("error");
      setMessage(result.error);
      return;
    }
    setMessageTone("info");
    setMessage(`Gemini retry queued for ${result.data.queuedAnswers} answer${result.data.queuedAnswers === 1 ? "" : "s"}.`);
    setSelectedResponse(null);
    void loadResponses(responseData.surveyId);
  }

  return (
    <>
      <PageHeader eyebrow="Client experience" title="Client Surveys" description="Create questionnaires and monitor client feedback about IT team performance." action={<div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setTab("history")} className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-[11px] font-semibold leading-none sm:flex-none ${tab === "history" ? "bg-indigo-600 text-white" : "text-slate-500"}`}><FileClock size={14} /> Survey History</button><button type="button" onClick={openResponses} className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-[11px] font-semibold leading-none sm:flex-none ${tab === "responses" ? "bg-indigo-600 text-white" : "text-slate-500"}`}><BarChart3 size={14} /> Responses</button></div>{canManage ? <Link href="/surveys/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold leading-none text-white"><Send size={15} /> Add Survey</Link> : null}</div>} />

      {message ? <p className={`mt-4 rounded-xl p-3 text-[11px] font-semibold ${messageTone === "info" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"}`}>{message}</p> : null}

      {tab === "history" ? (
        <Card className="mt-4 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-sm font-extrabold text-slate-800">Survey History</h2><p className="mt-1 text-[11px] text-slate-500">All draft, active, and completed questionnaires</p></div><div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50"><div className="px-4 py-2 text-center"><p className="text-base font-black text-slate-900">{totals.forms}</p><p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Forms</p></div><div className="px-4 py-2 text-center"><p className="text-base font-black text-emerald-600">{totals.active}</p><p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Active</p></div><div className="px-4 py-2 text-center"><p className="text-base font-black text-amber-600">{totals.responses}</p><p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Responses</p></div></div></div>
          <div className="divide-y divide-slate-100">
            {surveys.map((survey) => (
              <article key={survey.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-900">{survey.title}</h3><StatusBadge tone={statusTone(survey.status)}>{statusLabel(survey.status)}</StatusBadge></div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{survey.description || "No description"}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400"><span>{survey.questionCount} questions</span><span>{survey.responseCount} responses</span><span>Created {survey.createdAt}</span>{survey.expiresAt ? <span>Closes {new Date(survey.expiresAt).toLocaleString("en-GB")}</span> : null}</div>
                  </div>
                  <div className="survey-actions grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <button type="button" onClick={() => void copyLink(survey)} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold leading-none text-slate-600 sm:w-auto sm:min-w-24">{copiedCode === survey.publicCode ? <Check size={14} /> : <Copy size={14} />}{copiedCode === survey.publicCode ? "Copied" : "Copy Link"}</button>
                    <Link href={`/s/${survey.publicCode}`} target="_blank" className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[11px] font-semibold leading-none text-white sm:w-auto sm:min-w-24"><ExternalLink size={14} /> Preview</Link>
                    {canManage && survey.storedStatus !== "active" ? <Link href={`/surveys/${survey.id}/edit`} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 text-[11px] font-semibold leading-none text-white sm:w-auto sm:min-w-24"><Pencil size={14} /> Edit</Link> : null}
                    {canManage ? <button type="button" onClick={() => void duplicateSurvey(survey)} disabled={pendingId === survey.id} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-[11px] font-semibold leading-none text-indigo-700 disabled:opacity-50 sm:w-auto sm:min-w-24">{pendingId === survey.id ? <LoaderCircle size={14} className="animate-spin" /> : <Files size={14} />}{pendingId === survey.id ? "Duplicating..." : "Duplicate"}</button> : null}
                    {canManage && survey.status !== "expired" ? <button type="button" onClick={() => void changeStatus(survey)} disabled={pendingId === survey.id} className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold leading-none text-white disabled:bg-slate-300 sm:w-auto sm:min-w-24 ${survey.storedStatus === "active" ? "bg-slate-600" : "bg-emerald-600"}`}>{pendingId === survey.id ? <LoaderCircle size={14} className="animate-spin" /> : survey.storedStatus === "active" ? <X size={14} /> : <Send size={14} />}{survey.storedStatus === "active" ? "Close" : "Publish"}</button> : null}
                    {canManage ? <button type="button" onClick={() => setDeleteRecord(survey)} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-[11px] font-semibold leading-none text-white sm:w-auto sm:min-w-24"><Trash2 size={14} /> Delete</button> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {surveys.length === 0 ? <div className="px-5 py-14 text-center"><ClipboardList className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-xs text-slate-500">No surveys have been created.</p>{canManage ? <Link href="/surveys/new" className="mt-4 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-[11px] font-bold text-white">Create the first survey</Link> : null}</div> : null}
        </Card>
      ) : (
        <div className="mt-4">
          {surveys.length ? <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="block max-w-md flex-1 text-[11px] font-bold text-slate-600">Survey<select value={selectedSurveyId} onChange={(event) => selectSurvey(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500">{surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title} ({survey.responseCount})</option>)}</select></label><button type="button" onClick={() => void loadResponses(selectedSurveyId)} disabled={loadingResponses} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 disabled:text-slate-300"><RefreshCw size={15} className={loadingResponses ? "animate-spin" : ""} />Refresh Results</button></div> : null}
          {loadingResponses ? <div className="mt-4 grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle className="animate-spin text-indigo-600" size={26} /></div> : responseData ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total Responses" value={String(responseData.submissions.length)} icon={Users} detail="Responses for the selected survey" />
                <MetricCard label="Average Rating" value={ratingMetrics.responseCount ? ratingMetrics.averageRating.toFixed(1) : "—"} icon={Star} tone="amber" detail={<span className="inline-flex items-center gap-1">{[1, 2, 3, 4, 5].map((score) => <Star key={score} size={12} className={score <= Math.round(ratingMetrics.averageRating) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}</span>} />
                <MetricCard label="Satisfaction Score" value={ratingMetrics.responseCount ? `${Math.round(ratingMetrics.satisfactionScore)}%` : "—"} icon={CircleCheckBig} tone="green" detail={ratingMetrics.responseCount ? `Ratings 4–5 · target ${SURVEY_SATISFACTION_TARGET}% · achievement ${Math.round(ratingMetrics.targetAchievement)}%` : "No rating answers"} />
                <MetricCard label="AI Sentiment Assessment" value={aiMetrics.analyzed ? `${aiMetrics.positivePercent}%` : "—"} icon={MessageSquareText} tone="green" detail={`${aiMetrics.analyzed} text answers evaluated by Gemini AI`} />
              </div>
              {kpiMetrics.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{kpiMetrics.map(({ category, definition, metrics }) => <MetricCard key={category} label={`${definition.code} · ${definition.label}`} value={metrics.responseCount ? `${Math.round(metrics.satisfactionScore)}%` : "—"} icon={category === "installation" ? Network : Wrench} tone={category === "installation" ? "blue" : "amber"} detail={metrics.responseCount ? `Average ${metrics.averageRating.toFixed(1)} / 5 · ${metrics.responseCount} rating answers · target ${SURVEY_SATISFACTION_TARGET}%` : "No rating answers yet"} />)}</div> : null}
              <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">{responseData.questions.map((question, index) => <Card key={question.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Question {index + 1}</p>{question.kpiCategory ? <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700">{SURVEY_KPI_CATEGORIES[question.kpiCategory].code} · {SURVEY_KPI_CATEGORIES[question.kpiCategory].label}</span> : null}</div><h3 className="mt-1 text-sm font-bold text-slate-800">{question.title}</h3><QuestionSummary question={question} submissions={responseData.submissions} /></Card>)}</div>
                <Card className="h-fit overflow-hidden"><div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4"><div><h2 className="text-sm font-bold text-slate-800">Individual Responses</h2><p className="mt-1 text-[10px] text-slate-500">Text feedback is evaluated by Gemini AI</p></div>{aiStatus.total ? <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-bold ${aiStatus.pending ? "bg-blue-50 text-blue-700" : aiStatus.failed || aiStatus.missing ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{aiStatus.pending ? <LoaderCircle size={12} className="animate-spin" /> : aiStatus.failed || aiStatus.missing ? <CircleAlert size={12} /> : <CircleCheckBig size={12} />}{aiStatus.pending ? `Gemini AI analyzing ${aiStatus.pending}` : aiStatus.failed || aiStatus.missing ? `${aiStatus.failed + aiStatus.missing} need retry` : "Gemini AI complete"}</span> : null}</div><div className="divide-y divide-slate-100">{responseData.submissions.map((submission) => <button key={submission.id} type="button" onClick={() => setSelectedResponse(submission)} className="flex w-full items-center gap-3 p-4 text-left"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-black text-indigo-600">{submission.clientName.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-slate-800">{submission.clientName}</span><span className="mt-0.5 block truncate text-[9px] text-slate-400">{submission.division} · {submission.submittedAt}</span></span><Eye size={14} className="text-indigo-500" /></button>)}</div>{responseData.submissions.length === 0 ? <div className="p-8 text-center"><MessageSquareText className="mx-auto text-slate-300" size={25} /><p className="mt-3 text-[11px] text-slate-500">No client responses yet.</p></div> : null}</Card>
              </div>
            </>
          ) : surveys.length === 0 ? <Card className="mt-4 p-10 text-center text-xs text-slate-500">Create a survey before viewing responses.</Card> : null}
        </div>
      )}

      {selectedResponse && responseData ? <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="mx-auto my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-sm font-bold text-slate-900">{selectedResponse.clientName}</h2><p className="mt-1 text-[10px] text-slate-500">{selectedResponse.division} · {selectedResponse.submittedAt}</p></div><div className="flex items-center gap-2">{canManage && selectedResponseAiStatus && selectedResponseAiStatus.failed + selectedResponseAiStatus.missing > 0 ? <button type="button" onClick={() => void retryAnalysis(selectedResponse)} disabled={pendingId === `ai:${selectedResponse.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[10px] font-semibold text-white disabled:bg-slate-300">{pendingId === `ai:${selectedResponse.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <RotateCcw size={13} />}{pendingId === `ai:${selectedResponse.id}` ? "Queuing..." : "Retry AI"}</button> : null}<button type="button" onClick={() => setSelectedResponse(null)} className="grid size-9 place-items-center rounded-lg text-slate-400" aria-label="Close response"><X size={17} /></button></div></div><div className="space-y-4 p-5">{responseData.questions.map((question, index) => { const analysis = analysisFor(selectedResponse, question.id); return <div key={question.id} className="rounded-xl bg-slate-50 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Question {index + 1}</p><p className="mt-1 text-xs font-bold text-slate-700">{question.title}</p><p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">{answerText(answerFor(selectedResponse, question.id))}</p>{analysis ? <div className="mt-3 border-t border-slate-200 pt-3"><span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-bold ${sentimentClass(analysis)}`}>Gemini AI · {sentimentLabel(analysis)}{analysis.confidencePercent !== null ? ` · ${analysis.confidencePercent}%` : ""}</span>{analysis.summary ? <p className="mt-2 text-[10px] leading-5 text-slate-500">{analysis.summary}</p> : null}</div> : null}</div>; })}</div></div></div> : null}

      {deleteRecord ? <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-sm font-bold text-slate-900">Delete survey?</h2><p className="mt-2 text-xs leading-5 text-slate-500"><b>{deleteRecord.title}</b> and all {deleteRecord.responseCount} responses will be permanently removed.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteRecord(null)} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600">Cancel</button><button type="button" onClick={() => void confirmDelete()} disabled={pendingId === deleteRecord.id} className="h-9 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white disabled:bg-slate-300">{pendingId === deleteRecord.id ? "Deleting..." : "Delete"}</button></div></div></div> : null}
    </>
  );
}

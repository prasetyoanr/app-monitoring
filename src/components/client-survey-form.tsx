"use client";

import { Check, CheckCircle2, ChevronDown, ClipboardCheck, Send, Sparkles, Star } from "lucide-react";
import { useState } from "react";

import { submitSurveyAction } from "@/app/surveys/actions";
import type {
  PublicSurveyRecord,
  SurveyAnswerValue,
  SurveyQuestionRecord,
} from "@/data/survey-types";
import { SURVEY_RATING_LABELS } from "@/lib/survey-metrics";

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestionRecord;
  value: SurveyAnswerValue | undefined;
  onChange: (value: SurveyAnswerValue) => void;
}) {
  const commonClass = "mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50";
  if (question.type === "short_answer") {
    return <input value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} maxLength={5000} className={`${commonClass} h-11`} placeholder="Your answer" />;
  }
  if (question.type === "paragraph") {
    return <textarea value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} maxLength={5000} rows={4} className={`${commonClass} resize-y py-3`} placeholder="Your answer" />;
  }
  if (question.type === "dropdown") {
    return <label className="relative mt-3 block"><select value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none focus:border-indigo-500"><option value="">Choose an option</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /></label>;
  }
  if (question.type === "linear_scale") {
    return <div className="mt-4 sm:max-w-sm"><div className="grid grid-cols-5 gap-1 sm:gap-3">{[1, 2, 3, 4, 5].map((score) => { const rating = score as keyof typeof SURVEY_RATING_LABELS; const filled = typeof value === "number" && score <= value; return <label key={score} className="cursor-pointer text-center"><input type="radio" name={question.id} value={score} checked={value === score} onChange={() => onChange(score)} className="sr-only" aria-label={`${score} - ${SURVEY_RATING_LABELS[rating]}`} /><span className={`mx-auto grid min-h-11 place-items-center rounded-xl border bg-white ${value === score ? "border-amber-400 ring-4 ring-amber-50" : "border-slate-200"}`}><Star size={25} className={filled ? "fill-amber-400 text-amber-400" : "text-slate-300"} /></span><span className="mt-1 block text-[9px] font-semibold text-slate-400">{score}</span></label>; })}</div><div className="mt-2 flex justify-between gap-4 text-[9px] font-semibold text-slate-400"><span>Very Dissatisfied</span><span className="text-right">Very Satisfied</span></div>{typeof value === "number" ? <p className="mt-2 text-center text-[10px] font-bold text-amber-600">{SURVEY_RATING_LABELS[value as keyof typeof SURVEY_RATING_LABELS]}</p> : null}</div>;
  }
  if (question.type === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return <div className="mt-3 space-y-2">{question.options.map((option) => { const checked = selected.includes(option); return <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${checked ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600"}`}><input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter((item) => item !== option) : [...selected, option])} className="sr-only" /><span className={`grid size-5 shrink-0 place-items-center rounded border ${checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"}`}>{checked ? <Check size={13} /> : null}</span>{option}</label>; })}</div>;
  }
  return <div className="mt-3 space-y-2">{question.options.map((option) => { const checked = value === option; return <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${checked ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600"}`}><input type="radio" name={question.id} value={option} checked={checked} onChange={() => onChange(option)} className="sr-only" /><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${checked ? "border-[6px] border-indigo-600 bg-white" : "border-slate-300 bg-white"}`} />{option}</label>; })}</div>;
}

export function ClientSurveyForm({
  survey,
  code,
  divisions,
}: {
  survey: PublicSurveyRecord;
  code: string;
  divisions: string[];
}) {
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>({});
  const [clientName, setClientName] = useState("");
  const [divisionSelection, setDivisionSelection] = useState("");
  const [customDivision, setCustomDivision] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const available = survey.status === "active";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const unanswered = survey.questions.find((question) => {
      if (!question.isRequired) return false;
      const value = answers[question.id];
      return value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    });
    if (unanswered) {
      setError(`Please answer: ${unanswered.title}`);
      document.getElementById(`question-${unanswered.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    const result = await submitSurveyAction({
      code,
      clientName,
      division: divisionSelection === "Other" ? customDivision : divisionSelection,
      answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/60"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={32} /></span><h1 className="mt-5 text-xl font-bold text-slate-900">Response submitted</h1><p className="mt-2 text-sm leading-6 text-slate-500">Thank you. Your feedback has been recorded and will help the IT team improve its service.</p><p className="mt-5 text-[10px] leading-5 text-slate-400">You may close this page.</p></div></main>;
  }

  if (!available) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/60"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><ClipboardCheck size={26} /></span><h1 className="mt-5 text-xl font-bold text-slate-900">Survey unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">This survey is still a draft, has been closed, or has expired.</p></div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-indigo-950 px-4 pb-12 pt-7 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200"><ClipboardCheck size={15} /> IT Client Survey</div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{survey.title}</h1>
          {survey.description ? <p className="mt-2 max-w-xl whitespace-pre-wrap text-xs leading-5 text-indigo-100/75">{survey.description}</p> : null}
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-2xl px-4">
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <section className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-sm font-bold text-slate-900">Client Information</h2>
            <p className="mt-1 text-[10px] text-slate-500">Complete the information below before answering the survey.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-[11px] font-semibold text-slate-600">Name<input value={clientName} onChange={(event) => setClientName(event.target.value)} maxLength={120} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none" placeholder="Your name" /></label>
              <label className="block text-[11px] font-semibold text-slate-600">Division<span className="relative mt-1.5 block"><select value={divisionSelection} onChange={(event) => setDivisionSelection(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm outline-none"><option value="">Choose division</option>{divisions.map((division) => <option key={division} value={division}>{division}</option>)}<option value="Other">Other</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /></span></label>
            </div>
            {divisionSelection === "Other" ? <label className="mt-4 block text-[11px] font-semibold text-slate-600">Other Division<input value={customDivision} onChange={(event) => setCustomDivision(event.target.value)} maxLength={120} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none" placeholder="Enter your division" /></label> : null}
          </section>

          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 sm:px-6"><p className="text-[10px] font-semibold text-slate-500"><span className="text-rose-500">*</span> Required question</p></div>
          <div className="divide-y divide-slate-100">
            {survey.questions.map((question, index) => <section key={question.id} id={`question-${question.id}`} className="scroll-mt-5 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-700">{index + 1}</span><h2 className="pt-0.5 text-sm font-bold leading-6 text-slate-800">{question.title}{question.isRequired ? <span className="ml-1 text-rose-500">*</span> : null}</h2></div><div className="sm:pl-10"><QuestionField question={question} value={answers[question.id]} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} /></div></section>)}
          </div>

          <div className="border-t border-slate-100 p-5 sm:p-6">
            {error ? <p className="mb-4 rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-700"><Sparkles size={16} className="mt-0.5 shrink-0" /><p className="text-[10px] leading-5"><strong className="font-bold">AI-assisted evaluation.</strong> Text answers are automatically evaluated by Gemini AI to help measure IT service sentiment. Your name and division are not sent for AI analysis.</p></div>
            <button disabled={submitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 disabled:bg-slate-300 sm:w-auto"><Send size={16} /> {submitting ? "Submitting..." : "Submit Response"}</button>
          </div>
        </form>
        <p className="px-4 pt-5 text-center text-[9px] leading-4 text-slate-400">Your response is stored in the internal IT service system.</p>
      </div>
    </main>
  );
}

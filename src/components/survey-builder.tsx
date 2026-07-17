"use client";

import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Copy,
  List,
  Plus,
  Save,
  Send,
  SlidersHorizontal,
  Star,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createSurveyAction } from "@/app/surveys/actions";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import type {
  SurveyQuestionInput,
  SurveyQuestionType,
} from "@/data/survey-types";

const questionTypes: Array<{
  value: SurveyQuestionType;
  label: string;
  icon: typeof TextCursorInput;
}> = [
  { value: "short_answer", label: "Short answer", icon: TextCursorInput },
  { value: "paragraph", label: "Paragraph", icon: List },
  { value: "multiple_choice", label: "Multiple choice", icon: CircleDot },
  { value: "checkboxes", label: "Checkboxes", icon: CheckSquare },
  { value: "dropdown", label: "Dropdown", icon: ChevronDown },
  { value: "linear_scale", label: "Linear scale", icon: SlidersHorizontal },
];

const choiceTypes = new Set<SurveyQuestionType>([
  "multiple_choice",
  "checkboxes",
  "dropdown",
]);

function createQuestion(clientId: string): SurveyQuestionInput {
  return {
    clientId,
    type: "multiple_choice",
    title: "",
    isRequired: true,
    options: ["Option 1", "Option 2"],
  };
}

export function SurveyBuilder() {
  const router = useRouter();
  const nextId = useRef(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestionInput[]>([
    createQuestion("question-1"),
  ]);
  const [saving, setSaving] = useState<"draft" | "active" | null>(null);
  const [error, setError] = useState("");

  function freshId() {
    const id = `question-${nextId.current}`;
    nextId.current += 1;
    return id;
  }

  function updateQuestion(
    clientId: string,
    patch: Partial<SurveyQuestionInput>,
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.clientId === clientId ? { ...question, ...patch } : question,
      ),
    );
  }

  function changeType(clientId: string, type: SurveyQuestionType) {
    const options = choiceTypes.has(type) ? ["Option 1", "Option 2"] : [];
    updateQuestion(clientId, { type, options });
  }

  function addQuestion(afterIndex?: number) {
    const question = createQuestion(freshId());
    setQuestions((current) => {
      if (afterIndex === undefined) return [...current, question];
      const next = [...current];
      next.splice(afterIndex + 1, 0, question);
      return next;
    });
  }

  function duplicateQuestion(index: number) {
    setQuestions((current) => {
      const next = [...current];
      next.splice(index + 1, 0, {
        ...current[index],
        clientId: freshId(),
        options: [...current[index].options],
      });
      return next;
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeQuestion(clientId: string) {
    if (questions.length === 1) {
      updateQuestion(clientId, createQuestion(clientId));
      return;
    }
    setQuestions((current) =>
      current.filter((question) => question.clientId !== clientId),
    );
  }

  function updateOption(clientId: string, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question) => {
        if (question.clientId !== clientId) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      }),
    );
  }

  function removeOption(clientId: string, optionIndex: number) {
    setQuestions((current) =>
      current.map((question) =>
        question.clientId === clientId
          ? {
              ...question,
              options: question.options.filter((_, index) => index !== optionIndex),
            }
          : question,
      ),
    );
  }

  function addOption(clientId: string) {
    setQuestions((current) =>
      current.map((question) =>
        question.clientId === clientId
          ? {
              ...question,
              options: [
                ...question.options,
                `Option ${question.options.length + 1}`,
              ],
            }
          : question,
      ),
    );
  }

  async function save(status: "draft" | "active") {
    setSaving(status);
    setError("");
    const result = await createSurveyAction({
      title,
      description,
      expiresAt,
      status,
      questions,
    });
    setSaving(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/surveys");
    router.refresh();
  }

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Client experience"
        title="Add Survey"
        description="Create a client questionnaire and share it using a public link."
        action={<div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => void save("draft")}
            disabled={saving !== null}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 disabled:opacity-50"
          >
            <Save size={15} /> {saving === "draft" ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => void save("active")}
            disabled={saving !== null}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white disabled:bg-slate-300"
          >
            <Send size={15} /> {saving === "active" ? "Publishing..." : "Publish"}
          </button>
        </div>}
      />

      <Card>
        <SectionTitle title="Survey Information" subtitle="Set the survey name, description, and availability" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-600">Survey Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"
              placeholder="IT Service Satisfaction Survey"
            />
          </label>
          <label className="block lg:row-span-2">
            <span className="text-[11px] font-semibold text-slate-600">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={5}
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-xs leading-5 outline-none"
              placeholder="Tell clients why their feedback matters."
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-600">Close Automatically</span>
            <span className="ml-1 text-[10px] font-normal text-slate-400">(optional)</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-600 outline-none"
            />
          </label>
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <SectionTitle title="Questions" subtitle={`${questions.length} question${questions.length === 1 ? "" : "s"} in this survey`} action={<button type="button" onClick={() => addQuestion()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#3157d5] px-3 text-[10px] font-semibold text-white"><Plus size={14} /> Add Question</button>} />
        <div className="divide-y divide-slate-100">
        {questions.map((question, index) => {
          const TypeIcon =
            questionTypes.find((item) => item.value === question.type)?.icon ??
            TextCursorInput;
          return (
            <article
              key={question.clientId}
              className="p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-700">{index + 1}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="grid size-8 place-items-center rounded-lg text-slate-500 disabled:opacity-25" aria-label="Move question up"><ChevronUp size={15} /></button>
                  <button type="button" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="grid size-8 place-items-center rounded-lg text-slate-500 disabled:opacity-25" aria-label="Move question down"><ChevronDown size={15} /></button>
                </div>
              </div>
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <input
                    value={question.title}
                    onChange={(event) =>
                      updateQuestion(question.clientId, { title: event.target.value })
                    }
                    maxLength={500}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none"
                    placeholder="Write your question"
                  />
                  <label className="relative">
                    <TypeIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={15} />
                    <select
                      value={question.type}
                      onChange={(event) =>
                        changeType(
                          question.clientId,
                          event.target.value as SurveyQuestionType,
                        )
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-600 outline-none"
                    >
                      {questionTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  </label>
                </div>

                {choiceTypes.has(question.type) ? (
                  <div className="mt-4 space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        {question.type === "checkboxes" ? <span className="size-4 rounded border border-slate-300" /> : question.type === "dropdown" ? <span className="w-5 text-center text-[10px] font-bold text-slate-400">{optionIndex + 1}.</span> : <span className="size-4 rounded-full border border-slate-300" />}
                        <input value={option} onChange={(event) => updateOption(question.clientId, optionIndex, event.target.value)} maxLength={200} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-xs outline-none" placeholder={`Option ${optionIndex + 1}`} />
                        <button type="button" onClick={() => removeOption(question.clientId, optionIndex)} disabled={question.options.length <= 2} className="grid size-8 place-items-center rounded-lg text-slate-400 disabled:opacity-20" aria-label="Remove option"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(question.clientId)} className="ml-6 inline-flex h-8 items-center gap-1.5 text-[11px] font-bold text-indigo-600"><Plus size={14} /> Add option</button>
                  </div>
                ) : question.type === "linear_scale" ? (
                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((value) => <div key={value} className="text-center"><Star className="mx-auto fill-amber-400 text-amber-400" size={22} /><span className="mt-1 block text-[9px] font-semibold text-slate-400">{value}</span></div>)}
                  </div>
                ) : (
                  <div className={`mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-400 ${question.type === "paragraph" ? "w-full" : "max-w-sm"}`}>
                    {question.type === "paragraph" ? "Long answer text" : "Short answer text"}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => addQuestion(index)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold text-indigo-600"><Plus size={14} /> Add below</button>
                  <button type="button" onClick={() => duplicateQuestion(index)} className="grid size-9 place-items-center rounded-lg text-slate-500" aria-label="Duplicate question"><Copy size={15} /></button>
                  <button type="button" onClick={() => removeQuestion(question.clientId)} className="grid size-9 place-items-center rounded-lg text-rose-500" aria-label="Delete question"><Trash2 size={15} /></button>
                  <span className="mx-1 h-6 w-px bg-slate-200" />
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-600">
                    Required
                    <input type="checkbox" checked={question.isRequired} onChange={(event) => updateQuestion(question.clientId, { isRequired: event.target.checked })} className="peer sr-only" />
                    <span className="relative h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-indigo-600 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
                  </label>
                </div>
            </article>
          );
        })}
        </div>
      </Card>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-[11px] font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}

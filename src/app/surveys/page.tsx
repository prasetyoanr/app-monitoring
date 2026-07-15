import type { Metadata } from "next";
import { ChartNoAxesCombined, MessageSquareText, Send, Star, Users } from "lucide-react";
import { requireAuthenticatedUser } from "@/auth/session";
import { Card, MetricCard, PageHeader, SectionTitle } from "@/components/ui";
import { getSurveyRecords } from "@/data/app-data";

export const metadata: Metadata = { title: "Client Survey" };

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default async function SurveysPage() {
  const [responses, currentUser] = await Promise.all([
    getSurveyRecords(),
    requireAuthenticatedUser(),
  ]);
  const average = responses.length ? responses.reduce((sum, row) => sum + row.score, 0) / responses.length : 0;
  const positive = responses.filter((row) => row.score >= 4).length;
  const followUp = responses.filter((row) => row.score < 3).length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    value: responses.length ? Math.round((responses.filter((row) => row.score === star).length / responses.length) * 100) : 0,
  }));

  return (
    <>
      <PageHeader eyebrow="Client experience" title="Client Satisfaction Survey" description="Measure IT service quality based on the client experience after a ticket is completed." action={currentUser.role === "administrator" ? <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white hover:bg-[#2445b5]"><Send size={15} /> Send Survey</button> : undefined} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Satisfaction Score" value={`${average.toFixed(1)} / 5`} icon={Star} tone="amber" detail="From stored responses" /><MetricCard label="Responses" value={String(responses.length)} icon={Users} tone="green" detail="Completed client surveys" /><MetricCard label="Positive Responses" value={`${responses.length ? Math.round((positive / responses.length) * 100) : 0}%`} icon={MessageSquareText} detail="Score of 4 or 5" /><MetricCard label="Requires Follow-up" value={String(followUp)} icon={ChartNoAxesCombined} tone="red" detail="Score below 3" /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card><SectionTitle title="Latest Responses" subtitle="Client feedback after ticket closure" /><div className="divide-y divide-slate-100 px-4 sm:px-5">{responses.map((response) => <article key={response.id} className="py-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-[#3157d5]">{response.name.split(" ").map((word) => word[0]).join("")}</span><div className="min-w-0"><p className="text-xs font-semibold leading-5 text-slate-800">{response.name} <span className="font-normal text-slate-400">· {response.department}</span></p><div className="mt-1 flex gap-0.5">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={12} className={index < response.score ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}</div></div></div><span className="ml-12 text-[9px] text-slate-400 sm:ml-0">{relativeTime(response.respondedAt)}</span></div><p className="mt-3 text-[11px] leading-5 text-slate-600 sm:ml-12">“{response.comment}”</p><p className="mt-2 font-mono text-[9px] text-slate-400 sm:ml-12">{response.ticket}</p></article>)}</div></Card>
        <Card><SectionTitle title="Rating Distribution" subtitle={`Based on ${responses.length} stored responses`} /><div className="p-4 sm:p-5"><div className="flex items-center justify-center gap-3 py-4"><span className="text-5xl font-bold tracking-[-0.06em] text-slate-900">{average.toFixed(1)}</span><div><div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={16} className={index < Math.round(average) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}</div><p className="mt-1 text-[10px] text-slate-400">Average rating</p></div></div><div className="mt-5 space-y-3">{distribution.map((row) => <div key={row.star} className="flex items-center gap-3"><span className="w-8 text-right text-[10px] font-medium text-slate-500">{row.star} ★</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${row.value}%` }} /></div><span className="w-7 text-right text-[10px] font-semibold text-slate-600">{row.value}%</span></div>)}</div></div></Card>
      </div>
    </>
  );
}

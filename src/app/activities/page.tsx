import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Inbox, Search, UserRound, UsersRound } from "lucide-react";

import { GaWorkPlanBoard } from "@/components/ga-work-plan-board";
import { GaSpreadsheetCard } from "@/components/ga-spreadsheet-card";
import { Card } from "@/components/ui";
import { redirect } from "next/navigation";
import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { canKeepGaWorkPlan, getGaWorkspaceData, roleMayKeepGaWorkPlan } from "@/data/ga-workspace";
import { isDateInput, reportingPeriodStartForDate, shiftDate } from "@/lib/ga-work-plan";
import { jakartaDateInput } from "@/lib/jakarta-date";

export const metadata: Metadata = { title: "GA Activities" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const weekDateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

type ActivityPeriodMode = "date" | "period";

function activitiesHref(input: { memberId?: string; referenceDate: string; mode: ActivityPeriodMode; query?: string; page?: number; tab?: string }) {
  const params = new URLSearchParams();
  if (input.memberId) params.set("member", input.memberId);
  params.set("mode", input.mode);
  params.set("date", input.referenceDate);
  if (input.query) params.set("q", input.query);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.tab && input.tab !== "plan") params.set("tab", input.tab);
  return `/activities?${params.toString()}`;
}

function memberInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GA";
}

function statusTone(status: string) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
  if (status === "In Progress") return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
  if (status === "Reopened") return "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20";
  return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15";
}

function inboxEdge(status: string) {
  if (status === "Completed") return "border-emerald-500";
  if (status === "In Progress") return "border-amber-400";
  if (status === "Reopened") return "border-orange-500";
  return "border-slate-200";
}

const memberRoleLabel: Record<string, string> = {
  receptionist: "Admin",
  approver: "First Approval",
  final_approver: "Final Approval",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // IT staff report through the Inbox; GA Activities is not part of their workflow.
  const viewer = await requireAuthenticatedUser();
  if (viewer.role !== "administrator" && isITTeamUser(viewer)) redirect("/inbox");
  const params = await searchParams;
  const mode: ActivityPeriodMode = single(params.mode) === "date" ? "date" : "period";
  const requestedDate = single(params.date) || single(params.week);
  const referenceDate = isDateInput(requestedDate) ? requestedDate : jakartaDateInput();
  const weekStart = reportingPeriodStartForDate(referenceDate);
  const weekEnd = shiftDate(weekStart, 6);
  const memberQuery = single(params.q).trim().slice(0, 80);
  const requestedPage = Number.parseInt(single(params.page) || "1", 10);
  const data = await getGaWorkspaceData({
    requestedMemberId: single(params.member),
    weekStart,
    targetDate: mode === "date" ? referenceDate : undefined,
    query: memberQuery,
    page: requestedPage,
  });
  // Spreadsheet belongs to GA staff and only exists once an administrator enables it
  // (the administrator always sees it, to manage the permission).
  const showSpreadsheetTab = Boolean(data.spreadsheet)
    && data.selectedMember?.role === "service_agent"
    && (data.user.role === "administrator" || Boolean(data.spreadsheet?.enabled));
  const activeTab = single(params.tab) === "spreadsheet" && showSpreadsheetTab ? "spreadsheet" : "plan";
  const selectedMemberId = data.selectedMember?.id ?? "";
  const canEdit = data.user.role === "service_agent" && data.selectedMember?.id === data.user.id;
  const isOwnWorkspace = Boolean(data.selectedMember) && data.selectedMember?.id === data.user.id;
  const canEditPlan = isOwnWorkspace && roleMayKeepGaWorkPlan(data.user.role) && canKeepGaWorkPlan(data.selectedMember?.divisionSlug);
  const completedPlans = data.workPlans.filter((plan) => plan.status === "completed").length;
  const planCompletion = data.workPlans.length ? Math.round((completedPlans / data.workPlans.length) * 100) : 0;
  const viewerTheme = data.user.role === "administrator" ? "admin" : isITTeamUser(data.user) ? "it" : "ga";
  const heroBg = viewerTheme === "admin" ? "bg-[#111827]" : viewerTheme === "it" ? "bg-indigo-950" : "bg-[#004d32]";
  const isGaViewer = viewerTheme === "ga";
  const backBtn = isGaViewer
    ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
    : "bg-white/10 text-white ring-white/20 hover:bg-white/20";
  const applyBtn = isGaViewer
    ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
    : "bg-slate-900 text-white hover:bg-slate-700";
  const showTeamItCard = data.canSelectMembers && (
    !memberQuery || "team it".includes(memberQuery.toLocaleLowerCase("id-ID"))
  );

  return (
    <>
      {data.canSelectMembers && !data.selectedMember ? <>
        <Card className="mb-5 overflow-hidden p-4 sm:p-5">
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 sm:size-14">
                <UsersRound size={23} />
              </span>
              <div>
                <div className="flex items-end gap-2.5">
                  <strong className="text-4xl font-bold leading-none text-indigo-700 sm:text-5xl">{data.memberTotal}</strong>
                  <div className="pb-0.5 sm:pb-1">
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">Choose a staff</h2>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-indigo-500">Active GA staff · {data.memberTotal}</p>
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500 sm:text-xs">Select a card to view the staff inbox and activity plan.</p>
              </div>
            </div>
            <form method="get" className="flex w-full gap-2 sm:w-auto">
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="date" value={referenceDate} />
              <label className="relative min-w-0 flex-1 sm:w-64"><span className="sr-only">Search GA staff</span><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={memberQuery} maxLength={80} placeholder="Search staff name" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
              <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700">Search</button>
              {memberQuery ? <Link href={activitiesHref({ referenceDate, mode })} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Clear</Link> : null}
            </form>
            {data.canKeepOwnPlan ? <Link href={activitiesHref({ memberId: data.user.id, referenceDate, mode })} className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition active:scale-[0.98] ${applyBtn}`}>My work plan <ArrowRight size={14} /></Link> : null}

          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {showTeamItCard ? (
            <Link
              href="/inbox?scope=it"
              aria-label="Open Team IT Inbox"
              className="group relative flex min-h-48 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transform-none"
            >
              <span aria-hidden="true" className="absolute -right-10 -top-10 size-24 rounded-full bg-indigo-50 opacity-0 transition group-hover:opacity-100" />
              <div className="relative flex items-start justify-between gap-2">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-base font-bold text-indigo-700 ring-1 ring-indigo-100 transition group-hover:bg-indigo-600 group-hover:text-white">IT</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600"><ArrowRight size={15} /></span>
              </div>
              <div className="relative mt-auto min-w-0 pt-4">
                <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">Team IT</h3>
                <div className="mt-3 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Team workspace</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-600">Troubleshooting and Inbox</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[9px] font-semibold">
                  <span className="text-slate-400">Dedicated IT workflow</span>
                  <span className="text-indigo-600">Open</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-full rounded-full bg-indigo-500" />
                </div>
              </div>
            </Link>
          ) : null}
          {data.members.map((member) => {
            const completion = member.planCount > 0
              ? Math.round((member.completedCount / member.planCount) * 100)
              : 0;

            return (
              <Link
                key={member.id}
                href={activitiesHref({ memberId: member.id, referenceDate, mode, query: memberQuery, page: data.memberPage })}
                aria-label={`Open ${member.name}'s activity workspace`}
                className="group relative flex min-h-48 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transform-none"
              >
                <span aria-hidden="true" className="absolute -right-10 -top-10 size-24 rounded-full bg-indigo-50 opacity-0 transition group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-2">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-base font-bold text-indigo-700 ring-1 ring-indigo-100 transition group-hover:bg-indigo-600 group-hover:text-white">{memberInitials(member.name)}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600"><ArrowRight size={15} /></span>
                </div>
                <div className="relative mt-auto min-w-0 pt-4">
                  <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg" title={member.name}>{member.name}</h3>
                  {member.role !== "service_agent" ? <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-500">{memberRoleLabel[member.role] ?? member.role}</p> : null}
                  <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-2 text-center ring-1 ring-slate-100">
                    <div><strong className="block text-sm font-bold text-blue-700">{member.inboxCount}</strong><span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">Inbox</span></div>
                    <div className="border-x border-slate-200"><strong className="block text-sm font-bold text-slate-700">{member.planCount}</strong><span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">Plans</span></div>
                    <div><strong className="block text-sm font-bold text-emerald-600">{member.completedCount}</strong><span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">Done</span></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[9px] font-semibold">
                    <span className="text-slate-400">{mode === "date" ? "Daily progress" : "Period progress"}</span>
                    <span className="text-indigo-600">{completion}%</span>
                  </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${member.name} activity plan completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
                      <div className="h-full rounded-full bg-indigo-500 transition-[width]" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!data.members.length && !showTeamItCard ? <Card className="mt-3 p-10 text-center"><UserRound className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-bold text-slate-700">{memberQuery ? "No matching staff" : "No GA staff available"}</p><p className="mt-1 text-xs text-slate-400">{memberQuery ? "Try another name or clear the search." : "Add an active non-IT GA staff account to start planning work."}</p></Card> : null}

        {data.memberTotalPages > 1 ? <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><Link aria-disabled={data.memberPage <= 1} tabIndex={data.memberPage <= 1 ? -1 : undefined} href={activitiesHref({ referenceDate, mode, query: memberQuery, page: Math.max(1, data.memberPage - 1) })} className={`inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-[11px] font-semibold ${data.memberPage <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><ChevronLeft size={14} /> Previous</Link><span className="text-[10px] font-medium text-slate-500">Page {data.memberPage} of {data.memberTotalPages}</span><Link aria-disabled={data.memberPage >= data.memberTotalPages} tabIndex={data.memberPage >= data.memberTotalPages ? -1 : undefined} href={activitiesHref({ referenceDate, mode, query: memberQuery, page: Math.min(data.memberTotalPages, data.memberPage + 1) })} className={`inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-[11px] font-semibold ${data.memberPage >= data.memberTotalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Next <ChevronRight size={14} /></Link></div> : null}
      </> : null}

      {data.selectedMember ? <>
        <section className={`relative mb-4 flex items-center gap-2.5 overflow-hidden rounded-2xl px-3 py-2.5 text-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.5)] sm:gap-3 sm:px-4 ${heroBg}`}>
            {data.canSelectMembers
              ? <Link href={activitiesHref({ referenceDate, mode, query: memberQuery, page: requestedPage })} aria-label="Back to staff" className={`grid size-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset transition active:scale-[0.98] ${backBtn}`}><ArrowLeft size={14} /></Link>
              : null}
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-xs font-black text-slate-900">{memberInitials(data.selectedMember.name)}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black tracking-tight">{data.selectedMember.name}</h2>
            <p className="truncate text-[10px] text-slate-300">{data.selectedMember.divisionName} · {isOwnWorkspace ? "My workspace" : "Staff workspace"}</p>
          </div>
          <dl className="hidden shrink-0 items-center gap-4 md:flex">
            <div className="text-right"><dd className="text-sm font-black tabular-nums">{data.inbox.length}</dd><dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-300">Inbox</dt></div>
            <div className="text-right"><dd className="text-sm font-black tabular-nums">{data.workPlans.length}</dd><dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-300">Plans</dt></div>
            <div className="text-right"><dd className="text-sm font-black tabular-nums text-emerald-300">{completedPlans}</dd><dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-300">Done</dt></div>
          </dl>
          <span title={`Plan completion ${planCompletion}%`} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold tabular-nums ring-1 ring-inset ring-white/15">{planCompletion}%</span>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10"><span className="block h-full bg-emerald-400 transition-[width]" style={{ width: `${planCompletion}%` }} /></span>
        </section>

        <Card className="mb-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <form method="get" className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,10rem)_auto]">
              <input type="hidden" name="member" value={selectedMemberId} />
              {memberQuery ? <input type="hidden" name="q" value={memberQuery} /> : null}
              {requestedPage > 1 ? <input type="hidden" name="page" value={requestedPage} /> : null}
              {activeTab !== "plan" ? <input type="hidden" name="tab" value={activeTab} /> : null}
              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">View by</span>
                <select name="mode" defaultValue={mode} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                  <option value="date">Date</option>
                  <option value="period">Reporting period</option>
                </select>
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">Reference date</span>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={referenceDate}
                  aria-label="Choose activity reference date"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <button type="submit" className={`col-span-2 inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-5 font-bold transition active:scale-[0.98] sm:col-span-1 ${applyBtn}`}>Apply</button>
            </form>
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-1.5">
              <Link href={activitiesHref({ memberId: selectedMemberId, referenceDate: shiftDate(referenceDate, mode === "date" ? -1 : -7), mode, query: memberQuery, page: requestedPage, tab: activeTab })} aria-label={mode === "date" ? "Previous date" : "Previous reporting period"} className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-900 hover:text-slate-900"><ArrowLeft size={15} /></Link>
              <div className="min-w-44 flex-1 px-1 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{mode === "date" ? "Selected date" : "Friday to Thursday"}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-700">{mode === "date" ? weekDateFormat.format(new Date(`${referenceDate}T00:00:00Z`)) : `${weekDateFormat.format(new Date(`${weekStart}T00:00:00Z`))} – ${weekDateFormat.format(new Date(`${weekEnd}T00:00:00Z`))}`}</p>
              </div>
              <Link href={activitiesHref({ memberId: selectedMemberId, referenceDate: shiftDate(referenceDate, mode === "date" ? 1 : 7), mode, query: memberQuery, page: requestedPage, tab: activeTab })} aria-label={mode === "date" ? "Next date" : "Next reporting period"} className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-900 hover:text-slate-900"><ArrowRight size={15} /></Link>
            </div>
          </div>
        </Card>

        <div className="mb-5 flex items-center gap-4 border-b border-slate-200">
          <Link
            href={activitiesHref({ memberId: selectedMemberId, referenceDate, mode, query: memberQuery, page: requestedPage, tab: "plan" })}
            className={`relative pb-3 px-1 text-[11px] font-bold transition ${activeTab === "plan" ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            Activity Plan
            {activeTab === "plan" && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-indigo-600" />}
          </Link>
          {showSpreadsheetTab ? (
            <Link
              href={activitiesHref({ memberId: selectedMemberId, referenceDate, mode, query: memberQuery, page: requestedPage, tab: "spreadsheet" })}
              className={`relative pb-3 px-1 text-[11px] font-bold transition ${activeTab === "spreadsheet" ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              Spreadsheet
              {activeTab === "spreadsheet" && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-indigo-600" />}
            </Link>
          ) : null}
        </div>

        {activeTab === "spreadsheet" && data.spreadsheet ? (
          <GaSpreadsheetCard
            memberId={data.selectedMember.id}
            memberName={data.selectedMember.name}
            spreadsheet={data.spreadsheet}
            canManagePermission={data.user.role === "administrator"}
            canEditDetails={canEdit && data.spreadsheet.enabled}
          />
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Inbox size={17} /></span><div><h2 className="text-sm font-bold text-slate-900">Staff Inbox</h2><p className="mt-0.5 text-[10px] text-slate-500">Assigned GA requests · latest 50</p></div></div><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold text-white tabular-nums">{data.inbox.length}</span></div>
              {data.inbox.length ? <div className="divide-y divide-slate-100">{data.inbox.map((item) => <article key={item.id} className={`border-l-4 p-4 transition hover:bg-slate-50 sm:px-5 ${inboxEdge(item.status)}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-semibold text-slate-400">{item.id} · {dateFormat.format(new Date(item.reportedAt))}</p><h3 className="mt-1.5 text-xs font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-[10px] text-slate-500">{item.location} · {item.priority} priority</p></div><span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-bold ${statusTone(item.status)}`}>{item.status}</span></div></article>)}</div> : <div className="px-5 py-12 text-center"><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Inbox size={20} /></span><p className="mt-3 text-sm font-bold text-slate-700">Inbox is clear</p><p className="mt-1 text-xs text-slate-400">No assigned GA requests for this staff.</p></div>}
            </Card>

            <GaWorkPlanBoard memberName={data.selectedMember.name} periodStart={weekStart} periodEnd={weekEnd} selectedDate={mode === "date" ? referenceDate : undefined} plans={data.workPlans} canEdit={canEditPlan} amberCta={isGaViewer} />
          </div>
        )}
      </> : null}
    </>
  );
}

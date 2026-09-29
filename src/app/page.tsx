import Link from "next/link";
import { Activity, ArrowRight, CircleCheck, Clock3, ShieldAlert, TicketCheck, UserRoundCheck } from "lucide-react";
import { Card, MetricCard, SectionTitle, StatusBadge } from "@/components/ui";
import { getDashboardData } from "@/data/dashboard-data";
import { ticketStatusLabel } from "@/lib/request-workflow";

export default async function DashboardPage() {
  const {
    recentIssues: tickets,
    currentUser,
    canAccessBackups,
    activeIssues,
    completedIssues,
    backupTotal,
    backupSuccess,
    adminControl,
  } = await getDashboardData();
  const backupIssues = backupTotal - backupSuccess;
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const compactDateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(now);
  return (
    <>
      <header className="mb-5 flex min-w-0 items-center justify-between gap-3 sm:mb-6">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="shrink-0 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-[26px]">Dashboard</h1>
        </div>
        <time dateTime={now.toISOString()} className="shrink-0 text-right text-[9px] font-bold text-indigo-600 sm:text-[11px]">
          <span className="sm:hidden">{compactDateLabel}<br /></span><span className="hidden sm:inline">{todayLabel} · </span>{timeLabel} WIB
        </time>
      </header>

      <div className={`grid gap-2 sm:gap-4 ${canAccessBackups ? "grid-cols-3" : "grid-cols-2"}`}>
        <MetricCard compactOnMobile label="Active Issues" value={String(activeIssues)} icon={TicketCheck} tone="blue" detail="Not yet completed" />
        <MetricCard compactOnMobile label="Completed Issues" value={String(completedIssues)} icon={Clock3} tone="green" detail="Completed work" />
        {canAccessBackups ? <MetricCard compactOnMobile label="User Backups" value={`${backupTotal ? ((backupSuccess / backupTotal) * 100).toFixed(1) : "0.0"}%`} icon={CircleCheck} tone="red" detail={`${backupIssues} users require follow-up`} /> : null}
      </div>

      {adminControl ? (
        <Card className="mt-5 overflow-hidden">
          <SectionTitle title="Admin Control Center" subtitle="System priorities" />
          <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-3">
            {[
              {
                title: "Workflow",
                icon: UserRoundCheck,
                tone: "bg-indigo-50 text-indigo-600",
                items: [
                  { href: "/inbox?workflow=intake", label: "GA Admin", value: adminControl.gaAdmin },
                  { href: "/inbox?workflow=waiting_approver", label: "GA Supervisor", value: adminControl.gaSupervisor },
                  { href: "/inbox?workflow=waiting_final_approver", label: "Senior Approver", value: adminControl.seniorApprover },
                  { href: "/inbox?workflow=ready_for_assignment", label: "Awaiting Assignment", value: adminControl.unassigned },
                ],
              },
              {
                title: "Operations",
                icon: Activity,
                tone: "bg-amber-50 text-amber-600",
                items: [
                  { href: "/inbox?attention=stalled", label: "Stalled Work", value: adminControl.stalled },
                  { href: "/accounts?status=locked", label: "Locked Accounts", value: adminControl.lockedAccounts },
                ],
              },
              {
                title: "Security · 24h",
                icon: ShieldAlert,
                tone: "bg-rose-50 text-rose-600",
                items: [
                  { href: "/audit-logs?event=failed_login&period=24h", label: "Failed Logins", value: adminControl.failedLogins },
                  { href: "/audit-logs?event=authorization_denied&period=24h", label: "Denied Attempts", value: adminControl.deniedAttempts },
                  { href: "/audit-logs?event=sensitive_access&period=24h", label: "Sensitive Access", value: adminControl.sensitiveAccess },
                ],
              },
            ].map((group) => (
              <section key={group.title} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5"><span className={`grid size-7 place-items-center rounded-lg ${group.tone}`}><group.icon size={14} /></span><h3 className="text-[11px] font-bold text-slate-700">{group.title}</h3></div>
                <div className="divide-y divide-slate-100">{group.items.map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-2 px-3 py-2.5 text-[11px] hover:bg-white"><span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span><strong className="text-sm text-slate-900">{item.value}</strong><ArrowRight size={12} className="text-slate-300 group-hover:text-indigo-500" /></Link>)}</div>
              </section>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mt-5">
        <Card className="table-card overflow-hidden">
          <SectionTitle title="Latest Issues" subtitle="Recent service request activity" action={<Link href={currentUser.role === "requester" ? "/requests" : "/inbox"} className="flex items-center gap-1 text-[11px] font-semibold text-[#3157d5]">{currentUser.role === "requester" ? "My Requests" : "All records"} <ArrowRight size={13} /></Link>} />
          <div className="divide-y divide-slate-100 md:hidden">
            {tickets.slice(0, 4).map((ticket, index) => (
              <article
                key={ticket.id}
                className={`p-4 ${index === 2 ? "hidden sm:block" : index === 3 ? "hidden md:block" : ""}`}
              >
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xs font-semibold leading-5 text-slate-800">{ticket.title}</h3><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id}</p></div><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber"}>{ticketStatusLabel(ticket)}</StatusBadge></div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge><span className="text-[10px] text-slate-500">{ticket.category}</span><span className="ml-auto text-[10px] font-semibold text-slate-600">{ticket.completedDays === null ? "Not completed" : ticket.completedDays === 0 ? "Same day" : `${ticket.completedDays} days`}</span></div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50/80 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Record</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Completion Time</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.slice(0, 4).map((ticket) => (
                  <tr key={ticket.id} className="text-xs"><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{ticket.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id}</p></td><td className="px-4 py-3.5"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge></td><td className="px-4 py-3.5 text-slate-500">{ticket.category}</td><td className="px-4 py-3.5"><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber"}>{ticketStatusLabel(ticket)}</StatusBadge></td><td className="px-5 py-3.5 text-[11px] font-semibold text-slate-600">{ticket.completedDays === null ? "Not completed" : ticket.completedDays === 0 ? "Same day" : `${ticket.completedDays} days`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </>
  );
}

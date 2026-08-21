import Link from "next/link";
import { Activity, ArrowRight, CircleCheck, Clock3, TicketCheck } from "lucide-react";
import { Card, MetricCard, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { getDashboardData } from "@/data/dashboard-data";

export default async function DashboardPage() {
  const {
    recentIssues: tickets,
    currentUser,
    activeIssues,
    completedIssues,
    backupTotal,
    backupSuccess,
    failedBackups,
    overdueBackups,
  } = await getDashboardData();
  const backupIssues = backupTotal - backupSuccess;
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <>
      <PageHeader
        eyebrow={todayLabel}
        title="OneService Dashboard"
        description="Overview of today’s internal service activities at the Head Office and Factory."
      />

      <div className={`grid gap-2 sm:gap-4 ${currentUser.role === "administrator" ? "grid-cols-3" : "grid-cols-2"}`}>
        <MetricCard compactOnMobile label="Active Issues" value={String(activeIssues)} icon={TicketCheck} tone="blue" detail="Not yet completed" />
        <MetricCard compactOnMobile label="Completed Issues" value={String(completedIssues)} icon={Clock3} tone="green" detail="Approved by clients" />
        {currentUser.role === "administrator" ? <MetricCard compactOnMobile label="User Backups" value={`${backupTotal ? ((backupSuccess / backupTotal) * 100).toFixed(1) : "0.0"}%`} icon={CircleCheck} tone="red" detail={`${backupIssues} users require follow-up`} /> : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="table-card overflow-hidden">
          <SectionTitle title="Latest Issues" subtitle="Recent service request activity" action={<Link href={currentUser.role === "requester" ? "/requests" : "/inbox"} className="flex items-center gap-1 text-[11px] font-semibold text-[#3157d5]">{currentUser.role === "requester" ? "Permintaan saya" : "All records"} <ArrowRight size={13} /></Link>} />
          <div className="divide-y divide-slate-100 md:hidden">
            {tickets.slice(0, 4).map((ticket, index) => (
              <article
                key={ticket.id}
                className={`p-4 ${index === 2 ? "hidden sm:block" : index === 3 ? "hidden md:block" : ""}`}
              >
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xs font-semibold leading-5 text-slate-800">{ticket.title}</h3><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id}</p></div><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber"}>{ticket.status}</StatusBadge></div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge><span className="text-[10px] text-slate-500">{ticket.category}</span><span className="ml-auto text-[10px] font-semibold text-slate-600">{ticket.completedDays === null ? "Not completed" : ticket.completedDays === 0 ? "Same day" : `${ticket.completedDays} days`}</span></div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50/80 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Record</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Completion Time</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.slice(0, 4).map((ticket) => (
                  <tr key={ticket.id} className="text-xs"><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{ticket.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id}</p></td><td className="px-4 py-3.5"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge></td><td className="px-4 py-3.5 text-slate-500">{ticket.category}</td><td className="px-4 py-3.5"><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber"}>{ticket.status}</StatusBadge></td><td className="px-5 py-3.5 text-[11px] font-semibold text-slate-600">{ticket.completedDays === null ? "Not completed" : ticket.completedDays === 0 ? "Same day" : `${ticket.completedDays} days`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Requires Attention" subtitle="Today’s action priorities" />
          <div className="space-y-3 p-4">
            {[
              { icon: Clock3, tone: "amber", title: `${activeIssues} unresolved issues`, desc: "Service requests not yet completed" },
              ...(currentUser.role === "administrator" ? [{ icon: Activity, tone: "blue", title: `${backupIssues} user backup issues`, desc: `${failedBackups} failed and ${overdueBackups} overdue` }] : []),
            ].map((item) => <div key={item.title} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}><item.icon size={16} /></span><div><p className="text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.desc}</p></div></div>)}
          </div>
        </Card>
      </div>
    </>
  );
}

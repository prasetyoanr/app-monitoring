import Link from "next/link";
import { Activity, ArrowRight, CircleCheck, Clock3, Server, TicketCheck, TriangleAlert } from "lucide-react";
import { Card, MetricCard, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { getDashboardData } from "@/data/dashboard-data";
import { jakartaDateInput } from "@/lib/jakarta-date";

export default async function DashboardPage() {
  const {
    servers,
    recentIssues: tickets,
    currentUser,
    activeIssues,
    completedIssues,
    backupTotal,
    backupSuccess,
    failedBackups,
    overdueBackups,
    trend,
  } = await getDashboardData();
  const healthyServers = servers.filter((server) => server.status === "Healthy").length;
  const backupIssues = backupTotal - backupSuccess;
  const trendMap = new Map(trend.map((row) => [row.date, row.total]));
  const todayStart = new Date(`${jakartaDateInput()}T00:00:00+07:00`);
  const chartEntries = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(todayStart.getTime() - (13 - offset) * 86_400_000);
    const key = jakartaDateInput(date);
    return { key, value: trendMap.get(key) ?? 0 };
  });
  const chart = chartEntries.map((entry) => entry.value);
  const issuesInPeriod = chart.reduce((sum, value) => sum + value, 0);
  const maxChart = Math.max(1, ...chart);
  const chartLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
  });
  const chartLabels = [0, 3, 6, 9, 13].map((index) =>
    chartLabel.format(new Date(`${chartEntries[index].key}T00:00:00+07:00`)),
  );
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
        title="IT Team Activity Log"
        description="Overview of today’s internal IT activities at the Head Office and Factory."
        action={
          <Link href="/troubleshooting" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-[#2445b5]">
            <TicketCheck size={16} /> {currentUser.role === "administrator" ? "Manage Troubleshooting" : "View Troubleshooting"}
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Issues" value={String(activeIssues)} icon={TicketCheck} tone="blue" detail="Not yet completed" />
        <MetricCard label="Completed Issues" value={String(completedIssues)} icon={Clock3} tone="green" detail="Approved by clients" />
        <MetricCard label="Healthy Servers" value={`${healthyServers} / ${servers.length}`} icon={Server} tone="amber" detail={`${servers.length - healthyServers} servers require attention`} />
        <MetricCard label="User Backups" value={`${backupTotal ? ((backupSuccess / backupTotal) * 100).toFixed(1) : "0.0"}%`} icon={CircleCheck} tone="red" detail={`${backupIssues} users require follow-up`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <SectionTitle title="Issue Activity Trend" subtitle="Issues received over the last 14 days" />
          <div className="px-4 pb-5 pt-4 sm:px-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><span className="text-2xl font-bold tracking-tight text-slate-900">{issuesInPeriod}</span><span className="ml-2 text-xs text-slate-500">issues received</span></div>
              <div className="text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#3157d5]" />Received</span></div>
            </div>
            <div className="flex h-40 items-end gap-2 border-b border-slate-200 px-1 sm:gap-3">
              {chart.map((value, index) => (
                <div key={index} className="group relative flex h-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-indigo-500 transition group-hover:bg-indigo-700" style={{ height: `${Math.max(4, (value / maxChart) * 100)}%` }} title={`${value} issues`} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-slate-400">{chartLabels.map((label) => <span key={label}>{label}</span>)}</div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Infrastructure Health" subtitle="Updated 1 minute ago" action={<Link href="/monitoring" className="text-[11px] font-semibold text-[#3157d5]">View all</Link>} />
          <div className="divide-y divide-slate-100 px-5">
            {servers.slice(0, 4).map((server) => (
              <div key={server.name} className="flex items-center gap-3 py-3.5">
                <span className={`grid size-9 place-items-center rounded-xl ${server.status === "Healthy" ? "bg-emerald-50 text-emerald-600" : server.status === "Warning" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}><Server size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{server.name}</p><p className="mt-0.5 text-[10px] text-slate-400">CPU {server.cpu}% · RAM {server.memory}%</p></div>
                <StatusBadge tone={server.status === "Healthy" ? "green" : server.status === "Warning" ? "amber" : "red"}>{server.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="table-card overflow-hidden">
          <SectionTitle title="Latest Issues" subtitle="Recent troubleshooting activity" action={<Link href="/troubleshooting" className="flex items-center gap-1 text-[11px] font-semibold text-[#3157d5]">All records <ArrowRight size={13} /></Link>} />
          <div className="divide-y divide-slate-100 md:hidden">
            {tickets.slice(0, 4).map((ticket) => (
              <article key={ticket.id} className="p-4">
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
              { icon: TriangleAlert, tone: "rose", title: `${servers.find((server) => server.status === "Critical")?.name ?? "No server"} critical alert`, desc: `${servers.filter((server) => server.status !== "Healthy").length} infrastructure items require attention` },
              { icon: Clock3, tone: "amber", title: `${activeIssues} unresolved issues`, desc: "Troubleshooting records not yet completed" },
              { icon: Activity, tone: "blue", title: `${backupIssues} user backup issues`, desc: `${failedBackups} failed and ${overdueBackups} overdue` },
            ].map((item) => <div key={item.title} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.tone === "rose" ? "bg-rose-100 text-rose-600" : item.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}><item.icon size={16} /></span><div><p className="text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.desc}</p></div></div>)}
          </div>
        </Card>
      </div>
    </>
  );
}

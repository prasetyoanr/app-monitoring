import Link from "next/link";
import { Activity, ArrowRight, CircleCheck, Clock3, Server, TicketCheck, TriangleAlert } from "lucide-react";
import { Card, MetricCard, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { servers, tickets } from "@/data/mock-data";

const chart = [42, 58, 52, 71, 64, 86, 77, 92, 68, 82, 73, 88, 62, 74];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Monday, July 13, 2026"
        title="IT Team Activity Log"
        description="Overview of today’s internal IT activities at the Head Office and Factory."
        action={
          <Link href="/tickets" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-xs font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-[#2445b5]">
            <TicketCheck size={16} /> Manage Tickets
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Tickets" value="12" icon={TicketCheck} tone="blue" detail={<><b className="text-emerald-600">↓ 8%</b> from last week</>} />
        <MetricCard label="Completed Today" value="8" icon={Clock3} tone="green" detail={<><b className="text-emerald-600">6 issues</b> completed on the same day</>} />
        <MetricCard label="Healthy Servers" value="18 / 20" icon={Server} tone="amber" detail={<><b className="text-amber-600">2 servers</b> require attention</>} />
        <MetricCard label="User Backups" value="96.8%" icon={CircleCheck} tone="red" detail={<><b className="text-rose-600">3 users</b> require follow-up</>} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <SectionTitle title="Ticket Resolution Trend" subtitle="Service performance over the last 14 days" action={<select className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 outline-none"><option>14 days</option><option>30 days</option></select>} />
          <div className="px-5 pb-5 pt-4">
            <div className="mb-5 flex items-end justify-between">
              <div><span className="text-2xl font-bold tracking-tight text-slate-900">137</span><span className="ml-2 text-xs text-slate-500">tickets completed</span></div>
              <div className="flex gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#3157d5]" />Completed</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue-200" />Received</span></div>
            </div>
            <div className="flex h-40 items-end gap-2 border-b border-slate-200 px-1 sm:gap-3">
              {chart.map((height, index) => (
                <div key={index} className="group relative flex h-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-[#3157d5] to-[#6f8aeb] transition group-hover:from-[#2445b5]" style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-slate-400"><span>Jun 30</span><span>Jul 3</span><span>Jul 6</span><span>Jul 9</span><span>Jul 13</span></div>
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
        <Card className="overflow-hidden">
          <SectionTitle title="Latest Tickets" subtitle="Recent troubleshooting activity" action={<Link href="/tickets" className="flex items-center gap-1 text-[11px] font-semibold text-[#3157d5]">All tickets <ArrowRight size={13} /></Link>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50/80 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Record</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Completion Time</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.slice(0, 4).map((ticket) => (
                  <tr key={ticket.id} className="text-xs transition hover:bg-slate-50/60"><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{ticket.title}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id}</p></td><td className="px-4 py-3.5"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge></td><td className="px-4 py-3.5 text-slate-500">{ticket.category}</td><td className="px-4 py-3.5"><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber"}>{ticket.status}</StatusBadge></td><td className="px-5 py-3.5 text-[11px] font-semibold text-slate-600">{ticket.completedDays === null ? "Not completed" : ticket.completedDays === 0 ? "Same day" : `${ticket.completedDays} days`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Requires Attention" subtitle="Today’s action priorities" />
          <div className="space-y-3 p-4">
            {[
              { icon: TriangleAlert, tone: "rose", title: "WEB-LEGACY CPU at 94%", desc: "Ongoing for 12 minutes" },
              { icon: Clock3, tone: "amber", title: "2 unresolved issues", desc: "Recorded for more than 1 day" },
              { icon: Activity, tone: "blue", title: "3 user backup issues", desc: "1 failed and 2 overdue" },
            ].map((item) => <div key={item.title} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.tone === "rose" ? "bg-rose-100 text-rose-600" : item.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}><item.icon size={16} /></span><div><p className="text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.desc}</p></div></div>)}
          </div>
        </Card>
      </div>
    </>
  );
}

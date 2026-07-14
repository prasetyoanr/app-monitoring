import type { Metadata } from "next";
import { Activity, Cpu, ExternalLink, MemoryStick, Server, TriangleAlert } from "lucide-react";
import { Card, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import { servers } from "@/data/mock-data";

export const metadata: Metadata = { title: "Server Monitoring" };

function UsageBar({ value }: { value: number }) {
  return <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${value >= 90 ? "bg-rose-500" : value >= 80 ? "bg-amber-500" : "bg-[#3157d5]"}`} style={{ width: `${value}%` }} /></div>;
}

export default function MonitoringPage() {
  return (
    <>
      <PageHeader eyebrow="Prometheus · Connected" title="Server Monitoring" description="Infrastructure health overview. Detailed metric analysis remains available through Grafana." action={<button className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"><ExternalLink size={15} /> Open Grafana</button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total Servers" value="20" icon={Server} detail="18 online · 2 with issues" /><MetricCard label="Average CPU" value="46.8%" icon={Cpu} tone="green" detail="Within the normal range" /><MetricCard label="Average Memory" value="67.4%" icon={MemoryStick} tone="amber" detail="DB-PROD-01 above 85%" /><MetricCard label="Active Alerts" value="3" icon={TriangleAlert} tone="red" detail="1 critical · 2 warnings" /></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {servers.map((server) => (
          <Card key={server.name} className="p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
            <div className="flex items-start justify-between"><div className="flex gap-3"><span className={`grid size-10 place-items-center rounded-xl ${server.status === "Healthy" ? "bg-emerald-50 text-emerald-600" : server.status === "Warning" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}><Server size={19} /></span><div><p className="text-sm font-bold text-slate-800">{server.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{server.role} · {server.ip}</p></div></div><StatusBadge tone={server.status === "Healthy" ? "green" : server.status === "Warning" ? "amber" : "red"}>{server.status}</StatusBadge></div>
            <div className="mt-5 grid grid-cols-3 gap-4"><div><div className="flex justify-between text-[10px]"><span className="text-slate-400">CPU</span><b className="text-slate-700">{server.cpu}%</b></div><UsageBar value={server.cpu} /></div><div><div className="flex justify-between text-[10px]"><span className="text-slate-400">RAM</span><b className="text-slate-700">{server.memory}%</b></div><UsageBar value={server.memory} /></div><div><div className="flex justify-between text-[10px]"><span className="text-slate-400">Disk</span><b className="text-slate-700">{server.disk}%</b></div><UsageBar value={server.disk} /></div></div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><Activity size={12} /> Uptime {server.uptime}</span><button className="font-semibold text-[#3157d5]">View metrics</button></div>
          </Card>
        ))}
      </div>
    </>
  );
}

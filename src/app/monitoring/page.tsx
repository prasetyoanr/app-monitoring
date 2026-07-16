import type { Metadata } from "next";
import { Activity, Cpu, MemoryStick, Server, TriangleAlert } from "lucide-react";
import { Card, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import { getServerRecords } from "@/data/app-data";

export const metadata: Metadata = { title: "Server Monitoring" };

function UsageBar({ value }: { value: number }) {
  return <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${value >= 90 ? "bg-rose-500" : value >= 80 ? "bg-amber-500" : "bg-[#3157d5]"}`} style={{ width: `${value}%` }} /></div>;
}

export default async function MonitoringPage() {
  const servers = await getServerRecords();
  const healthy = servers.filter((server) => server.status === "Healthy").length;
  const alerts = servers.length - healthy;
  const averageCpu = servers.length ? servers.reduce((sum, server) => sum + server.cpu, 0) / servers.length : 0;
  const averageMemory = servers.length ? servers.reduce((sum, server) => sum + server.memory, 0) / servers.length : 0;
  return (
    <>
      <PageHeader eyebrow="Stored measurements" title="Server Monitoring" description="Infrastructure health based on the latest measurements stored in the application." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total Servers" value={String(servers.length)} icon={Server} detail={`${healthy} healthy · ${alerts} with issues`} /><MetricCard label="Average CPU" value={`${averageCpu.toFixed(1)}%`} icon={Cpu} tone="green" detail="Latest stored measurement" /><MetricCard label="Average Memory" value={`${averageMemory.toFixed(1)}%`} icon={MemoryStick} tone="amber" detail="Latest stored measurement" /><MetricCard label="Active Alerts" value={String(alerts)} icon={TriangleAlert} tone="red" detail="Warning and critical servers" /></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {servers.map((server) => (
          <Card key={server.name} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${server.status === "Healthy" ? "bg-emerald-50 text-emerald-600" : server.status === "Warning" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}><Server size={19} /></span><div className="min-w-0"><p className="text-sm font-bold text-slate-800">{server.name}</p><p className="mt-0.5 break-words text-[10px] leading-4 text-slate-400">{server.role} · {server.ip}</p></div></div><StatusBadge tone={server.status === "Healthy" ? "green" : server.status === "Warning" ? "amber" : "red"}>{server.status}</StatusBadge></div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4"><div><div className="flex justify-between text-[10px]"><span className="text-slate-400">CPU</span><b className="text-slate-700">{server.cpu}%</b></div><UsageBar value={server.cpu} /></div><div><div className="flex justify-between text-[10px]"><span className="text-slate-400">RAM</span><b className="text-slate-700">{server.memory}%</b></div><UsageBar value={server.memory} /></div><div><div className="flex justify-between text-[10px]"><span className="text-slate-400">Disk</span><b className="text-slate-700">{server.disk}%</b></div><UsageBar value={server.disk} /></div></div>
            <div className="mt-5 border-t border-slate-100 pt-3 text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><Activity size={12} /> Uptime {server.uptime}</span></div>
          </Card>
        ))}
      </div>
    </>
  );
}

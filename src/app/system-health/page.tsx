import type { Metadata } from "next";
import { Activity, CircleAlert, CircleCheck, Clock3, Database, HardDrive, RefreshCw, Rocket, TriangleAlert } from "lucide-react";

import { Card, PageHeader } from "@/components/ui";
import { getSystemHealth, type HealthStatus } from "@/data/system-health";

export const metadata: Metadata = { title: "System Health" };

const statusStyle: Record<HealthStatus, { label: string; badge: string; icon: typeof CircleCheck }> = {
  healthy: { label: "Healthy", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CircleCheck },
  warning: { label: "Warning", badge: "bg-amber-50 text-amber-700 ring-amber-600/20", icon: TriangleAlert },
  critical: { label: "Critical", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: CircleAlert },
  unknown: { label: "Unknown", badge: "bg-slate-100 text-slate-600 ring-slate-500/15", icon: CircleAlert },
};

const checkIcons = {
  database: Database,
  storage: HardDrive,
  migrations: Activity,
  runtime: Clock3,
  version: Rocket,
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export default async function SystemHealthPage() {
  const report = await getSystemHealth();
  const overall = statusStyle[report.overallStatus];
  const OverallIcon = overall.icon;

  return (
    <div className="admin-standard-type">
      <PageHeader
        eyebrow="Administrator Only"
        title="System Health"
        description="Read-only checks for the application runtime, database, storage, version, and migrations."
        action={<form method="get"><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"><RefreshCw size={14} /> Refresh checks</button></form>}
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-2xl ring-1 ring-inset ${overall.badge}`}><OverallIcon size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Status</p><p className="mt-1 text-lg font-bold text-slate-900">{overall.label}</p></div></div>
        <p className="text-[10px] font-medium text-slate-500">Last checked {dateTime.format(new Date(report.checkedAt)).replace(",", "")} WIB</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {report.checks.map((check) => {
          const state = statusStyle[check.status];
          const StateIcon = state.icon;
          const CheckIcon = checkIcons[check.id];
          return (
            <Card key={check.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><CheckIcon size={17} /></span><span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-bold ring-1 ring-inset ${state.badge}`}><StateIcon size={11} /> {state.label}</span></div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{check.label}</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{check.value}</p>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">{check.detail}</p>
              {check.responseTimeMs ? <p className="mt-3 border-t border-slate-100 pt-3 text-[9px] font-semibold text-slate-400">Response time: {check.responseTimeMs} ms</p> : null}
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] leading-5 text-slate-400">Checks use limited read-only queries. Database credentials, server paths, and environment values are never displayed.</p>
    </div>
  );
}

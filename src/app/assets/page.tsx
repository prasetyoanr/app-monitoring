import type { Metadata } from "next";
import { Boxes, CircleDollarSign, Laptop, PackageCheck, Search, Wrench } from "lucide-react";
import { assets } from "@/data/mock-data";
import { Card, MetricCard, PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "IT Assets" };

export default function AssetsPage() {
  return (
    <>
      <PageHeader eyebrow="Asset management" title="IT Asset Inventory" description="Track ownership, condition, location, and maintenance history for company equipment." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total Assets" value="486" icon={Boxes} detail="427 currently in use" /><MetricCard label="Active Assets" value="87.9%" icon={PackageCheck} tone="green" detail="Distributed across 8 divisions" /><MetricCard label="Under Repair" value="9" icon={Wrench} tone="amber" detail="3 awaiting spare parts" /><MetricCard label="Expiring Warranties" value="14" icon={CircleDollarSign} tone="red" detail="Within the next 60 days" /></div>
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-slate-800">Asset List</h2><p className="mt-1 text-[11px] text-slate-500">Sample of registered equipment</p></div><label className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none focus:border-blue-400 focus:bg-white" placeholder="Search code or equipment..." /></label></div>
        <div className="divide-y divide-slate-100 md:hidden">
          {assets.map((asset) => (
            <article key={asset.code} className="p-4">
              <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#3157d5]"><Laptop size={17} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-xs font-bold leading-5 text-slate-800">{asset.name}</h3><StatusBadge tone={asset.status === "Active" ? "green" : "amber"}>{asset.status}</StatusBadge></div><p className="mt-1 font-mono text-[9px] text-slate-400">{asset.code}</p></div></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-[11px]"><div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">User</dt><dd className="mt-1 font-medium text-slate-700">{asset.user}</dd></div><div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Division</dt><dd className="mt-1 font-medium text-slate-700">{asset.department}</dd></div><div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Type</dt><dd className="mt-1 font-medium text-slate-700">{asset.type}</dd></div><div><dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Health</dt><dd className="mt-1 flex items-center gap-2"><span className="h-1.5 flex-1 rounded-full bg-slate-200"><span className={`block h-full rounded-full ${asset.health < 60 ? "bg-rose-500" : asset.health < 85 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${asset.health}%` }} /></span><b className="text-[10px] text-slate-600">{asset.health}%</b></dd></div></dl>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50/80 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">Equipment</th><th className="px-4 py-3.5">User</th><th className="px-4 py-3.5">Division</th><th className="px-4 py-3.5">Type</th><th className="px-4 py-3.5">Health</th><th className="px-5 py-3.5">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{assets.map((asset) => <tr key={asset.code} className="text-xs hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#3157d5]"><Laptop size={16} /></span><div><p className="font-semibold text-slate-800">{asset.name}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{asset.code}</p></div></div></td><td className="px-4 py-4 text-slate-600">{asset.user}</td><td className="px-4 py-4 text-slate-600">{asset.department}</td><td className="px-4 py-4 text-slate-600">{asset.type}</td><td className="px-4 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-slate-100"><div className={`h-full rounded-full ${asset.health < 60 ? "bg-rose-500" : asset.health < 85 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${asset.health}%` }} /></div><span className="text-[10px] font-semibold text-slate-600">{asset.health}%</span></div></td><td className="px-5 py-4"><StatusBadge tone={asset.status === "Active" ? "green" : "amber"}>{asset.status}</StatusBadge></td></tr>)}</tbody></table></div>
      </Card>
    </>
  );
}

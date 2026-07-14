import { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[#3157d5]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-[-0.035em] text-[#14213d] sm:text-[28px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`card-shadow rounded-2xl border border-slate-200/80 bg-white ${className}`}>{children}</section>;
}

export function StatusBadge({ tone, children }: { tone: "green" | "blue" | "amber" | "red" | "gray"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/15",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
    red: "bg-rose-50 text-rose-700 ring-rose-600/15",
    gray: "bg-slate-100 text-slate-600 ring-slate-500/10",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string; detail: React.ReactNode; icon: LucideIcon; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-[27px] font-bold tracking-[-0.04em] text-slate-900">{value}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span>
      </div>
      <div className="mt-3 text-[11px] text-slate-500">{detail}</div>
    </Card>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

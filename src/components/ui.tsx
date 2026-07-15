import { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 md:flex-row md:items-end">
      <div className="max-w-3xl">
        {eyebrow ? <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-indigo-600">{eyebrow}</p> : null}
        <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-[30px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-slate-500">{description}</p>
      </div>
      {action ? <div className="w-full shrink-0 md:w-auto [&>*]:w-full md:[&>*]:w-auto">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`color-card rounded-2xl border bg-white ${className}`}>{children}</section>;
}

export function StatusBadge({ tone, children }: { tone: "green" | "blue" | "amber" | "red" | "gray"; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    blue: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    gray: "bg-slate-100 text-slate-600 ring-slate-500/15",
  };
  return <span className={`status-badge inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string; detail: React.ReactNode; icon: LucideIcon; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "bg-indigo-600 text-white",
    green: "bg-emerald-500 text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-rose-500 text-white",
  };
  return (
    <Card className={`metric-card metric-${tone} p-4 sm:p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-2 text-[28px] font-black tracking-[-0.05em] text-slate-900">{value}</p>
        </div>
        <span className={`metric-icon grid size-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon size={20} strokeWidth={2.3} /></span>
      </div>
      <div className="mt-3 text-[11px] font-medium text-slate-500">{detail}</div>
    </Card>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="section-heading flex items-start justify-between gap-3 border-b border-indigo-100/80 px-4 py-4 sm:px-5">
      <div>
        <h2 className="text-sm font-extrabold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

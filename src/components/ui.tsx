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

export function StatusBadge({ tone, attention = false, children }: { tone: "green" | "blue" | "amber" | "red" | "gray"; attention?: boolean; children: React.ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    blue: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    gray: "bg-slate-100 text-slate-600 ring-slate-500/15",
  };
  return <span className={`status-badge inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${tones[tone]} ${attention ? "shadow-[0_0_0_3px_rgba(16,185,129,0.16)]" : ""}`} title={attention ? "New request awaiting action" : undefined}>{attention ? <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-600" /></span> : null}{children}</span>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "blue", compactOnMobile = false }: { label: string; value: string; detail: React.ReactNode; icon: LucideIcon; tone?: "blue" | "green" | "amber" | "red"; compactOnMobile?: boolean }) {
  const tones = {
    blue: "bg-indigo-600 text-white",
    green: "bg-emerald-500 text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-rose-500 text-white",
  };
  return (
    <Card className={`metric-card metric-${tone} ${compactOnMobile ? "min-w-0 p-2.5 sm:p-5" : "p-4 sm:p-5"}`}>
      <div className={compactOnMobile ? "flex flex-col sm:flex-row sm:items-start sm:justify-between" : "flex items-start justify-between"}>
        <div className={compactOnMobile ? "order-2 min-w-0 sm:order-1" : ""}>
          <p className={compactOnMobile ? "min-h-6 text-[8px] font-bold uppercase leading-3 tracking-[0.04em] text-slate-500 sm:min-h-0 sm:text-[11px] sm:tracking-[0.08em]" : "text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"}>{label}</p>
          <p className={compactOnMobile ? "mt-1 truncate text-xl font-black tracking-[-0.05em] text-slate-900 sm:mt-2 sm:text-[28px]" : "mt-2 text-[28px] font-black tracking-[-0.05em] text-slate-900"}>{value}</p>
        </div>
        <span className={`metric-icon grid place-items-center ${compactOnMobile ? "order-1 mb-2 size-7 rounded-lg sm:order-2 sm:mb-0 sm:size-11 sm:rounded-2xl" : "size-11 rounded-2xl"} ${tones[tone]}`}><Icon className={compactOnMobile ? "size-3.5 sm:size-5" : "size-5"} strokeWidth={2.3} /></span>
      </div>
      <div className={compactOnMobile ? "hidden sm:mt-3 sm:block sm:text-[11px] sm:font-medium sm:text-slate-500" : "mt-3 text-[11px] font-medium text-slate-500"}>{detail}</div>
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

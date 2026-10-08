import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, MonitorCheck, Search, ShieldCheck, X } from "lucide-react";

import { Card, PageHeader } from "@/components/ui";
import {
  auditModuleOptions,
  AUDIT_LOG_EXPORT_LIMIT,
  getActiveSessionSummary,
  getAuditLogRecords,
  type AuditActorType,
  type AuditEvent,
  type AuditLogFilters,
  type AuditModule,
  type AuditPeriod,
} from "@/data/audit-log-data";

export const metadata: Metadata = { title: "Log" };

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

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function humanize(value: string) {
  return value.replaceAll(".", " ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actorLabel(record: Awaited<ReturnType<typeof getAuditLogRecords>>["records"][number]) {
  if (record.actorType === "system") return "System";
  if (record.actorName) return record.actorUsername ? `${record.actorName} · ${record.actorUsername}` : record.actorName;
  if (record.actorType === "client") return record.actorId || "Client";
  return record.actorId ? `Deleted account · ${record.actorId}` : humanize(record.actorType);
}

function metadataEntries(metadata: Record<string, unknown> | null) {
  if (!metadata) return [];
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== "object")
    .slice(0, 6)
    .map(([key, value]) => ({
      key: humanize(key),
      value: String(value).slice(0, 180),
    }));
}

function pageHref(filters: AuditLogFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.module) params.set("module", filters.module);
  if (filters.event) params.set("event", filters.event);
  if (filters.actorType) params.set("actor", filters.actorType);
  if (filters.period) params.set("period", filters.period);
  if (filters.fromDate) params.set("from", filters.fromDate);
  if (filters.toDate) params.set("to", filters.toDate);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/audit-logs?${query}` : "/audit-logs";
}

function exportHref(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.module) params.set("module", filters.module);
  if (filters.event) params.set("event", filters.event);
  if (filters.actorType) params.set("actor", filters.actorType);
  if (filters.period) params.set("period", filters.period);
  if (filters.fromDate) params.set("from", filters.fromDate);
  if (filters.toDate) params.set("to", filters.toDate);
  const query = params.toString();
  return query ? `/audit-logs/export?${query}` : "/audit-logs/export";
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const moduleValue = single(params.module);
  const actorValue = single(params.actor);
  const eventValue = single(params.event);
  const periodValue = single(params.period);
  const filters: AuditLogFilters = {
    query: single(params.q).trim().slice(0, 120),
    module: auditModuleOptions.some((option) => option.value === moduleValue) ? moduleValue as AuditModule : "",
    event: ["failed_login", "authorization_denied", "sensitive_access"].includes(eventValue) ? eventValue as AuditEvent : "",
    actorType: ["technician", "requester", "client", "system"].includes(actorValue) ? actorValue as AuditActorType : "",
    period: periodValue === "24h" ? periodValue as AuditPeriod : "",
    fromDate: single(params.from),
    toDate: single(params.to),
    page: Number.parseInt(single(params.page) || "1", 10),
  };
  const [result, activeSessions] = await Promise.all([
    getAuditLogRecords(filters),
    getActiveSessionSummary(),
  ]);
  const hasFilters = Boolean(filters.query || filters.module || filters.event || filters.actorType || filters.period || filters.fromDate || filters.toDate);
  const activeFilterCount = [filters.module, filters.event, filters.actorType, filters.period, filters.fromDate, filters.toDate].filter(Boolean).length;
  const eventLabels: Record<string, string> = { failed_login: "Failed login", authorization_denied: "Unauthorized attempt", sensitive_access: "Sensitive access" };
  const actorLabels: Record<string, string> = { technician: "Staff", requester: "Requester", client: "Client", system: "System" };
  const activeChips = [
    filters.module ? { label: auditModuleOptions.find((option) => option.value === filters.module)?.label ?? filters.module, href: pageHref({ ...filters, module: "" }, 1) } : null,
    filters.event ? { label: eventLabels[filters.event] ?? filters.event, href: pageHref({ ...filters, event: "" }, 1) } : null,
    filters.actorType ? { label: actorLabels[filters.actorType] ?? filters.actorType, href: pageHref({ ...filters, actorType: "" }, 1) } : null,
    filters.period ? { label: "Last 24 hours", href: pageHref({ ...filters, period: "" }, 1) } : null,
    filters.fromDate ? { label: `From ${filters.fromDate}`, href: pageHref({ ...filters, fromDate: "" }, 1) } : null,
    filters.toDate ? { label: `To ${filters.toDate}`, href: pageHref({ ...filters, toDate: "" }, 1) } : null,
  ].filter((chip): chip is { label: string; href: string } => chip !== null);

  return (
    <div className="admin-standard-type">
      <PageHeader
        eyebrow="Administrator Only"
        title="Log"
        description="Review security-sensitive activity, workflow decisions, account changes, and administrative actions across the application."
        action={<form action={exportHref(filters)} method="post"><button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 md:w-auto" title={`Export up to ${AUDIT_LOG_EXPORT_LIMIT.toLocaleString("en-US")} matching records`}><Download size={15} /> Export Log</button></form>}
      />

      <Card className="mb-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><MonitorCheck size={18} /></span>
            <div className="min-w-0"><h2 className="text-sm font-bold text-slate-900">Active sessions</h2><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{activeSessions.userCount} active {activeSessions.userCount === 1 ? "user" : "users"} · expired and inactive-account sessions are excluded</p></div>
          </div>
          <strong className="shrink-0 text-2xl font-bold tracking-tight text-slate-900">{activeSessions.sessionCount}</strong>
        </div>
      </Card>

      <Card className="mb-5 p-4 sm:p-5">
        <form method="get" className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <span className="relative block min-w-0 flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={filters.query} maxLength={120} placeholder="Search actor, action, or record ID…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
            </span>
            <div className="flex gap-2">
              <button type="submit" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white transition hover:bg-indigo-700 sm:flex-none"><Filter size={14} /> Apply</button>
              {hasFilters ? <Link href="/audit-logs" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Reset</Link> : null}
            </div>
          </div>

          <details open={hasFilters ? true : undefined} className="group rounded-xl border border-slate-100 bg-slate-50/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600">
                <Filter size={13} className="shrink-0 text-slate-400" />
                <span className="truncate">More filters</span>
                {activeFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span> : <span className="hidden text-[11px] font-normal text-slate-400 sm:inline">Module, event, actor, date</span>}
              </span>
              <ChevronDown size={15} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t border-slate-100 px-3.5 py-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Module
                <select name="module" defaultValue={filters.module} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400">
                  {auditModuleOptions.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Event
                <select name="event" defaultValue={filters.event} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400">
                  <option value="">All events</option><option value="failed_login">Failed login</option><option value="authorization_denied">Unauthorized attempt</option><option value="sensitive_access">Sensitive data access</option>
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Actor
                <select name="actor" defaultValue={filters.actorType} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400">
                  <option value="">All actors</option><option value="technician">Staff</option><option value="requester">Requester</option><option value="client">Client</option><option value="system">System</option>
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Period
                <select name="period" defaultValue={filters.period} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400">
                  <option value="">All time</option><option value="24h">Last 24 hours</option>
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">From
                <input name="from" type="date" defaultValue={filters.fromDate} max={filters.toDate || undefined} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400" />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">To
                <input name="to" type="date" defaultValue={filters.toDate} min={filters.fromDate || undefined} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-400" />
              </label>
            </div>
          </details>

          {activeChips.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeChips.map((chip) => (
                <Link key={chip.label} href={chip.href} title={`Remove ${chip.label}`} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-3 pr-2 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100">
                  <span className="max-w-44 truncate">{chip.label}</span><X size={12} />
                </Link>
              ))}
              <Link href="/audit-logs" className="inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold text-slate-400 transition hover:text-slate-600">Clear all</Link>
            </div>
          ) : null}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><ShieldCheck size={17} /></span><div><h2 className="text-sm font-bold text-slate-900">Recorded activity</h2><p className="mt-0.5 text-[10px] text-slate-500">{result.total} matching records · newest first · WIB</p></div></div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Page {result.page} of {result.totalPages}</span>
        </div>

        {result.records.length ? <>
          <div className="divide-y divide-slate-100 md:hidden">
            {result.records.map((record) => {
              const details = metadataEntries(record.metadata);
              return <article key={record.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-900">{humanize(record.action)}</p><p className="mt-1 truncate text-[10px] text-slate-500">{actorLabel(record)}</p></div><span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700">{humanize(record.actorType)}</span></div><p className="mt-3 font-mono text-[9px] text-slate-500">{record.entityType} · {record.entityId}</p>{details.length ? <dl className="mt-3 grid gap-1 rounded-xl bg-slate-50 p-3">{details.map((detail) => <div key={detail.key} className="grid grid-cols-[7rem_1fr] gap-2 text-[10px]"><dt className="font-semibold text-slate-500">{detail.key}</dt><dd className="break-words text-slate-700">{detail.value}</dd></div>)}</dl> : null}<time dateTime={record.createdAt} className="mt-3 flex items-center gap-1.5 text-[9px] font-medium text-slate-400"><Activity size={11} /> {dateTime.format(new Date(record.createdAt)).replace(",", "")} WIB</time></article>;
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-5 py-3">Details</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{result.records.map((record) => { const details = metadataEntries(record.metadata); return <tr key={record.id} className="align-top text-[11px]"><td className="whitespace-nowrap px-5 py-4 font-medium text-slate-500">{dateTime.format(new Date(record.createdAt)).replace(",", "")}<span className="ml-1 text-[9px] text-slate-400">WIB</span></td><td className="px-4 py-4"><p className="max-w-52 font-semibold text-slate-800">{actorLabel(record)}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{humanize(record.actorType)}</p></td><td className="px-4 py-4"><span className="inline-flex rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{humanize(record.action)}</span></td><td className="px-4 py-4"><p className="font-semibold text-slate-700">{humanize(record.entityType)}</p><p className="mt-1 max-w-48 break-all font-mono text-[9px] text-slate-400">{record.entityId}</p></td><td className="px-5 py-4">{details.length ? <dl className="space-y-1">{details.map((detail) => <div key={detail.key} className="grid grid-cols-[8rem_1fr] gap-2"><dt className="font-semibold text-slate-400">{detail.key}</dt><dd className="max-w-sm break-words text-slate-600" title={detail.value}>{detail.value}</dd></div>)}</dl> : <span className="text-slate-300">—</span>}</td></tr>; })}</tbody>
            </table>
          </div>
        </> : <div className="px-5 py-14 text-center"><ShieldCheck className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-bold text-slate-700">No audit records found</p><p className="mt-1 text-xs text-slate-400">Adjust the filters or wait for new application activity.</p></div>}

        {result.totalPages > 1 ? <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5"><Link aria-disabled={result.page <= 1} tabIndex={result.page <= 1 ? -1 : undefined} href={pageHref(filters, Math.max(1, result.page - 1))} className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-[11px] font-semibold ${result.page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><ChevronLeft size={14} /> Previous</Link><span className="text-[10px] text-slate-500">{(result.page - 1) * 50 + 1}–{Math.min(result.page * 50, result.total)} of {result.total}</span><Link aria-disabled={result.page >= result.totalPages} tabIndex={result.page >= result.totalPages ? -1 : undefined} href={pageHref(filters, Math.min(result.totalPages, result.page + 1))} className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-[11px] font-semibold ${result.page >= result.totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Next <ChevronRight size={14} /></Link></div> : null}
      </Card>
    </div>
  );
}

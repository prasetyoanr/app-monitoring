"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  CircleCheck,
  Clock3,
  Eye,
  Inbox,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
  TicketCheck,
  UserRoundCheck,
} from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/ui";

type Group = "workflow" | "operations" | "security";
type Severity = "critical" | "warning" | "info";

export interface AdminTile {
  id: "intake" | "first" | "final" | "assign" | "stalled" | "locked" | "failed" | "denied" | "sensitive";
  group: Group;
  label: string;
  hint: string;
  value: number;
  href: string;
  /** How serious the tile is when its value is above zero. */
  severity: Severity;
}

export interface AdminOverviewTicket {
  id: string;
  title: string;
  category: string;
  location: string;
  statusLabel: string;
  statusTone: "green" | "blue" | "amber";
  completion: string;
}

interface AdminOverviewProps {
  firstName: string;
  dateLabel: string;
  compactDateLabel: string;
  timeLabel: string;
  activeIssues: number;
  completionRate: number;
  tiles: AdminTile[];
  tickets: AdminOverviewTicket[];
}

const icons = {
  intake: Inbox,
  first: UserRoundCheck,
  final: CircleCheck,
  assign: TicketCheck,
  stalled: Clock3,
  locked: LockKeyhole,
  failed: KeyRound,
  denied: ShieldAlert,
  sensitive: Eye,
} as const;

const tabs: Array<{ id: "all" | Group; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "workflow", label: "Workflow" },
  { id: "operations", label: "Operasi" },
  { id: "security", label: "Keamanan · 24j" },
];

const severityStyle: Record<Severity, { card: string; icon: string; value: string; dot: string }> = {
  critical: { card: "border-rose-200 bg-rose-50/60 hover:border-rose-300", icon: "bg-rose-100 text-rose-600", value: "text-rose-600", dot: "bg-rose-500" },
  warning: { card: "border-amber-200 bg-amber-50/60 hover:border-amber-300", icon: "bg-amber-100 text-amber-600", value: "text-amber-600", dot: "bg-amber-500" },
  info: { card: "border-indigo-100 bg-indigo-50/40 hover:border-indigo-300", icon: "bg-indigo-100 text-indigo-600", value: "text-indigo-700", dot: "bg-indigo-500" },
};

function ticketEdge(tone: AdminOverviewTicket["statusTone"]) {
  return tone === "green" ? "border-emerald-500" : tone === "blue" ? "border-indigo-500" : "border-amber-400";
}

export function AdminOverview({
  firstName,
  dateLabel,
  compactDateLabel,
  timeLabel,
  activeIssues,
  completionRate,
  tiles,
  tickets,
}: AdminOverviewProps) {
  const [group, setGroup] = useState<"all" | Group>("all");
  const [onlyActive, setOnlyActive] = useState(false);

  const needsAction = tiles.filter((tile) => tile.value > 0 && tile.severity !== "info");
  const visible = tiles.filter((tile) => (group === "all" || tile.group === group) && (!onlyActive || tile.value > 0));
  const countFor = (id: "all" | Group) => tiles.filter((tile) => (id === "all" || tile.group === id) && tile.value > 0).length;

  return (
    <>
      <header className="mb-4 overflow-hidden rounded-2xl bg-slate-900 p-4 text-white shadow-[0_16px_40px_-22px_rgba(15,23,42,0.6)] sm:px-5">
        <span aria-hidden="true" className="block h-0.5 w-12 rounded-full bg-amber-400" />
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Overview · Administrator
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[9px] normal-case tracking-normal text-slate-200">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="sm:hidden">{compactDateLabel} · {timeLabel}</span>
                <span className="hidden sm:inline">{dateLabel} · {timeLabel} WIB</span>
              </span>
            </p>
            <h1 className="mt-1.5 truncate text-xl font-black tracking-[-0.02em] sm:text-2xl">Welcome back, {firstName}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/inbox" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20 active:scale-95">
              <span className="size-1.5 rounded-full bg-indigo-300" />{activeIssues} aktif
            </Link>
            <Link href="/inbox" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20 active:scale-95">
              <span className="size-1.5 rounded-full bg-emerald-300" />{completionRate}% selesai
            </Link>
            <button
              type="button"
              onClick={() => {
                setGroup("all");
                setOnlyActive(true);
                document.getElementById("admin-control")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${needsAction.length ? "bg-rose-500/90 text-white hover:bg-rose-500" : "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"}`}
            >
              <span className="relative flex size-1.5">
                {needsAction.length ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-70" /> : null}
                <span className="relative inline-flex size-1.5 rounded-full bg-white" />
              </span>
              {needsAction.length ? `${needsAction.length} perlu tindakan` : "Semua aman"}
            </button>
            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-white/15 lg:block" />
            <Link href="/inbox" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 text-xs font-bold text-slate-900 transition hover:bg-amber-300 active:scale-95">
              <Inbox size={14} />Inbox
            </Link>
            <Link href="/admin-operations" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3.5 text-xs font-bold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/20 active:scale-95">
              <Activity size={14} />Operasional
            </Link>
          </div>
        </div>
      </header>

      <section id="admin-control" className="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Kelompok kontrol" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {tabs.map((tab) => {
              const active = group === tab.id;
              const count = countFor(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroup(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition active:scale-95 ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {tab.label}
                  <span className={`min-w-4 rounded-full px-1 text-center text-[9px] tabular-nums ${count ? (active ? "bg-slate-900 text-white" : "bg-slate-300 text-slate-700") : "bg-transparent text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 self-start text-[11px] font-semibold text-slate-600 sm:self-auto">
            <button
              type="button"
              role="switch"
              aria-checked={onlyActive}
              onClick={() => setOnlyActive((value) => !value)}
              className={`relative h-5 w-9 rounded-full transition ${onlyActive ? "bg-slate-900" : "bg-slate-300"}`}
            >
              <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${onlyActive ? "translate-x-4" : ""}`} />
            </button>
            Hanya yang perlu tindakan
          </label>
        </div>

        {visible.length ? (
          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((tile) => {
              const Icon = icons[tile.id];
              const active = tile.value > 0;
              const style = severityStyle[tile.severity];
              return (
                <Link
                  key={tile.id}
                  href={tile.href}
                  title={`${tile.label}: ${tile.value}. ${tile.hint}`}
                  className={`group relative flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 transition duration-150 hover:-translate-y-px hover:shadow-sm active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 ${active ? style.card : "border-slate-200/90 bg-white hover:border-slate-300"}`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md ${active ? style.icon : "bg-slate-100 text-slate-400"}`}><Icon size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold leading-4 text-slate-700">{tile.label}</span>
                    <span className="block truncate text-[9px] leading-3 text-slate-400">{tile.hint}</span>
                  </span>
                  {active && tile.severity !== "info" ? (
                    <span aria-hidden="true" className="relative flex size-1.5 shrink-0"><span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${style.dot}`} /><span className={`relative inline-flex size-1.5 rounded-full ${style.dot}`} /></span>
                  ) : null}
                  <strong className={`min-w-6 shrink-0 text-right text-lg font-black leading-none tabular-nums ${active ? style.value : "text-slate-300"}`}>{tile.value}</strong>
                  <ArrowRight size={12} aria-hidden="true" className="-ml-1 hidden shrink-0 -translate-x-1 text-slate-400 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 sm:block" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50/70 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><CircleCheck size={18} /></span>
            <div>
              <p className="text-xs font-bold text-slate-800">Semua aman</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Tidak ada item yang butuh tindakan di kelompok ini.</p>
            </div>
            {onlyActive ? <button type="button" onClick={() => setOnlyActive(false)} className="ml-auto rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95">Tampilkan semua</button> : null}
          </div>
        )}
      </section>

      <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Isu terbaru</h2>
            <p className="text-[10px] text-slate-500">Ketuk baris untuk membuka Inbox</p>
          </div>
          <Link href="/inbox" className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700 active:scale-95">
            Semua <ArrowRight size={13} />
          </Link>
        </div>
        {tickets.length ? (
          <ul className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href="/inbox" className={`group flex items-center gap-3 border-l-4 px-4 py-2 transition hover:bg-slate-50 active:bg-slate-100 ${ticketEdge(ticket.statusTone)}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-800">{ticket.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-[9px] text-slate-400">{ticket.id} · {ticket.category} · {ticket.completion}</span>
                  </span>
                  <span className="hidden sm:block"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge></span>
                  <StatusBadge tone={ticket.statusTone}>{ticket.statusLabel}</StatusBadge>
                  <ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-400"><TicketCheck size={18} /></span>
            <p className="mt-2.5 text-sm font-bold text-slate-700">Belum ada isu tercatat</p>
            <p className="mt-1 text-xs text-slate-400">Data muncul di sini begitu ada permintaan atau laporan baru.</p>
          </div>
        )}
      </section>
    </>
  );
}

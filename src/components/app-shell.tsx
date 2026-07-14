"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronDown,
  ClipboardCheck,
  Gauge,
  HardDriveDownload,
  FileBarChart,
  Menu,
  Search,
  Server,
  TicketCheck,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Overview", href: "/", icon: Gauge },
  { label: "Troubleshooting", href: "/troubleshooting", icon: TicketCheck, count: 12 },
  { label: "Backup User", href: "/backups", icon: HardDriveDownload, count: 3 },
  { label: "Monitoring", href: "/monitoring", icon: Server },
  { label: "Surveys", href: "/surveys", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: FileBarChart },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname.startsWith("/troubleshooting/approval/")) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 xl:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <span className="grid size-9 place-items-center rounded-xl bg-[#3157d5] text-white shadow-lg shadow-blue-600/20">
              <Activity size={19} strokeWidth={2.5} />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[13px] font-bold leading-4 tracking-tight text-slate-900">IT Activity Log</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Internal Workspace</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 xl:flex" aria-label="Main navigation">
            {navigation.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition ${active ? "bg-blue-50 text-[#3157d5]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                >
                  <Icon size={15} strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                  {item.count ? <span className={`rounded px-1.5 py-0.5 text-[9px] ${active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{item.count}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <label className="relative hidden w-52 lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-[11px] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Search records..." aria-label="Global search" />
            </label>
            <button className="relative grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Notifications">
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-white bg-rose-500" />
            </button>
            <button className="hidden items-center gap-2 rounded-xl border border-slate-200 py-1 pl-1 pr-2.5 text-left hover:bg-slate-50 sm:flex">
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-[#3157d5] to-[#7690ee] text-[9px] font-bold text-white">IT</span>
              <span><span className="block text-[10px] font-semibold leading-3 text-slate-800">IT Team</span><span className="block text-[9px] text-slate-400">Workspace</span></span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            <button onClick={() => setMenuOpen((open) => !open)} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-600 xl:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg xl:hidden" aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-[1600px] gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {navigation.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold ${active ? "bg-blue-50 text-[#3157d5]" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={17} /><span className="flex-1">{item.label}</span>{item.count ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px]">{item.count}</span> : null}</Link>;
              })}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="page-enter mx-auto max-w-[1600px] p-4 sm:p-6 xl:p-8">{children}</main>
    </div>
  );
}

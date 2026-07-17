"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronDown,
  ClipboardCheck,
  Database,
  Gauge,
  HardDriveDownload,
  FileBarChart,
  LogOut,
  Menu,
  Server,
  TicketCheck,
  UserCog,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";

const navigationBase = [
  { label: "Overview", href: "/", icon: Gauge },
  { label: "Troubleshooting", href: "/troubleshooting", icon: TicketCheck },
  { label: "Backup User", href: "/backups", icon: HardDriveDownload },
  { label: "Monitoring", href: "/monitoring", icon: Server },
  { label: "Surveys", href: "/surveys", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: FileBarChart },
];

export function AppShell({
  children,
  counts,
  user,
}: {
  children: React.ReactNode;
  counts: { issues: number; backups: number };
  user: {
    name: string;
    username: string;
    role: "administrator" | "boss";
  };
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    function closeUserMenu(event: PointerEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeUserMenu);
    return () => document.removeEventListener("pointerdown", closeUserMenu);
  }, [userMenuOpen]);
  const roleLabel = user.role === "administrator" ? "Administrator" : "Boss";
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const navigation = navigationBase.map((item) => ({
    ...item,
    count: item.href === "/troubleshooting" ? counts.issues : item.href === "/backups" ? counts.backups : undefined,
  }));

  if (
    pathname.startsWith("/b/") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/troubleshooting/approval/") ||
    pathname.startsWith("/backups/submit/")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <header className="app-navbar sticky top-0 z-40 border-b border-white/10 bg-indigo-950 text-white">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 xl:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark grid size-10 place-items-center rounded-2xl text-white">
              <Activity size={19} strokeWidth={2.5} />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[13px] font-extrabold leading-4 tracking-tight text-white">IT Activity Log</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200/70">Internal Workspace</span>
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
                  data-active={active}
                  className={`nav-link flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[11px] font-semibold transition ${active ? "bg-white text-indigo-700 shadow-lg shadow-indigo-950/20" : "text-indigo-100/75 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={15} strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                  {item.count ? <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${active ? "bg-indigo-100 text-indigo-700" : "bg-white/10 text-cyan-100"}`}>{item.count}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div ref={userMenuRef} className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 py-1 pl-1 pr-2.5 text-left hover:border-cyan-300/30 hover:bg-white/15"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-500 text-[9px] font-bold text-white shadow-lg shadow-indigo-950/30">{initials}</span>
                <span><span className="block max-w-28 truncate text-[10px] font-semibold leading-3 text-white">{user.name}</span><span className="block text-[9px] text-indigo-200/70">{roleLabel}</span></span>
                <ChevronDown size={13} className={`text-indigo-200/70 transition ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {userMenuOpen ? (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-indigo-100 bg-white p-2 text-slate-700 shadow-2xl shadow-indigo-950/25" role="menu">
                  {user.role === "administrator" ? <><Link href="/master-data" onClick={() => setUserMenuOpen(false)} className="mt-1 flex h-10 items-center gap-2.5 rounded-lg px-3 text-xs font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700" role="menuitem"><Database size={15} /> Master Data</Link><Link href="/accounts" onClick={() => setUserMenuOpen(false)} className="mt-1 flex h-10 items-center gap-2.5 rounded-lg px-3 text-xs font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700" role="menuitem"><UserCog size={15} /> Account Settings</Link></> : null}
                  <form action={logoutAction}>
                    <button type="submit" className="mt-1 flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" role="menuitem">
                      <LogOut size={15} /> Logout
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
            <button onClick={() => setMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15 xl:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="border-t border-white/10 bg-indigo-950 px-4 py-3 shadow-2xl xl:hidden" aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-[1600px] gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {navigation.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold ${active ? "bg-white text-indigo-700 shadow-lg" : "text-indigo-100/75 hover:bg-white/10 hover:text-white"}`}><Icon size={17} /><span className="flex-1">{item.label}</span>{item.count ? <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${active ? "bg-indigo-100" : "bg-white/10"}`}>{item.count}</span> : null}</Link>;
              })}
              {user.role === "administrator" ? <><Link href="/master-data" onClick={() => setMenuOpen(false)} className="flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-indigo-100 hover:bg-white/10 sm:hidden"><Database size={17} /><span>Master Data</span></Link><Link href="/accounts" onClick={() => setMenuOpen(false)} className="flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-indigo-100 hover:bg-white/10 sm:hidden"><UserCog size={17} /><span>Account Settings</span></Link></> : null}
              <form action={logoutAction} className="sm:hidden">
                <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 hover:text-white"><LogOut size={17} /><span>Logout</span></button>
              </form>
            </div>
          </nav>
        ) : null}
      </header>

      <main className="app-main page-enter relative mx-auto max-w-[1600px] p-4 sm:p-6 xl:p-8">{children}</main>
    </div>
  );
}

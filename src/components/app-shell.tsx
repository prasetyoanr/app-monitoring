"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ClipboardCheck,
  Database,
  Gauge,
  HardDriveDownload,
  FileBarChart,
  LogOut,
  Menu,
  TicketCheck,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  administratorOnly?: boolean;
  staffOnly?: boolean;
  requesterOnly?: boolean;
};

const navigationBase: NavigationItem[] = [
  { label: "Overview", href: "/", icon: Gauge },
  { label: "Troubleshooting", href: "/troubleshooting", icon: TicketCheck, staffOnly: true },
  { label: "Permintaan Saya", href: "/requests", icon: TicketCheck, requesterOnly: true },
  { label: "Backup User", href: "/backups", icon: HardDriveDownload, administratorOnly: true },
  { label: "Surveys", href: "/surveys", icon: ClipboardCheck, staffOnly: true },
  { label: "Reports", href: "/reports", icon: FileBarChart, staffOnly: true },
];

const primaryPagePaths = new Set([
  "/",
  "/troubleshooting",
  "/requests",
  "/backups",
  "/surveys",
  "/reports",
]);

function secondaryPageFallback(pathname: string) {
  const feature = pathname.split("/").filter(Boolean)[0];
  return navigationBase.some((item) => item.href === `/${feature}`)
    ? `/${feature}`
    : "/";
}

export function AppShell({
  children,
  counts,
  notifications,
  user,
}: {
  children: React.ReactNode;
  counts: { issues: number; backups: number; newRequests: number };
  notifications: { id: string; title: string; requester: string; division: string; reportedAt: string }[];
  user: {
    name: string;
    username: string;
    role: "administrator" | "boss" | "technician" | "requester";
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    function closeUserMenu(event: PointerEvent) {
      const target = event.target as Node;
      if (!userMenuRef.current?.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeUserMenu);
    return () => document.removeEventListener("pointerdown", closeUserMenu);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!notificationOpen) return;

    function closeNotification(event: PointerEvent) {
      const target = event.target as Node;
      if (!notificationRef.current?.contains(target)) {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeNotification);
    return () => document.removeEventListener("pointerdown", closeNotification);
  }, [notificationOpen]);
  const roleLabel = user.role === "administrator" ? "Administrator" : user.role === "technician" ? "Petugas" : user.role === "requester" ? "Pemohon" : "Atasan";
  const displayName = user.role === "requester" ? user.username : user.name;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const navigation = navigationBase
    .filter((item) => (!item.administratorOnly || user.role === "administrator") && (!item.staffOnly || user.role !== "requester") && (!item.requesterOnly || user.role === "requester"))
    .map((item) => ({
      ...item,
      count: item.href === "/troubleshooting" ? counts.issues : item.href === "/backups" ? counts.backups : undefined,
    }));
  const showBackButton = !primaryPagePaths.has(pathname);

  if (
    pathname === "/login" ||
    pathname === "/register" ||
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
            <span className="grid size-10 place-items-center rounded-2xl bg-white p-1 shadow-lg shadow-black/10">
              <Image src="/oneservice-logo.png" alt="Logo OneService" width={40} height={40} className="h-full w-full object-contain" priority />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-extrabold leading-4 tracking-tight text-white">OneService</span>
              <span className="block text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-200/70 sm:text-[9px] sm:tracking-[0.16em]">Portal Layanan Internal</span>
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
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user.role === "administrator" || user.role === "technician" ? (
              <div ref={notificationRef} className="relative">
                <button type="button" onClick={() => setNotificationOpen((open) => !open)} className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-indigo-100/80 transition hover:border-cyan-300/30 hover:bg-white/15 hover:text-white" aria-label={counts.newRequests > 0 ? `${counts.newRequests} permintaan baru` : "Notifikasi"} aria-expanded={notificationOpen} aria-haspopup="dialog" title="Notifikasi">
                  <Bell size={17} />
                  {counts.newRequests > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-indigo-950">{counts.newRequests > 99 ? "99+" : counts.newRequests}</span> : null}
                </button>
                {notificationOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-indigo-100 bg-white text-slate-700 shadow-2xl shadow-indigo-950/25" role="dialog" aria-label="Notifikasi permintaan baru">
                    <div className="bg-slate-100 border-b border-slate-100 px-4 py-3"><p className="mt-1 text-xs font-bold text-slate-800">{counts.newRequests > 0 ? `${counts.newRequests} Permintaan baru.` : "Tidak ada permintaan baru."}</p></div>
                    {notifications.length > 0 ? <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">{notifications.map((notification) => <Link key={notification.id} href="/troubleshooting" onClick={() => setNotificationOpen(false)} className="block px-4 py-3 transition hover:bg-indigo-50"><p className="truncate text-[11px] font-semibold text-slate-800">{notification.title}</p><p className="mt-1 text-[10px] text-slate-500">{notification.requester} · {notification.division}</p><p className="mt-1 text-[9px] text-slate-400">{notification.reportedAt}</p></Link>)}</div> : <div className="px-4 py-6 text-center text-[11px] text-slate-400">Semua permintaan sudah ditangani.</div>}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div ref={userMenuRef} className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 py-1 pl-1 pr-2.5 text-left hover:border-cyan-300/30 hover:bg-white/15"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-500 text-[9px] font-bold text-white shadow-lg shadow-indigo-950/30">{initials}</span>
                <span><span className="block max-w-28 truncate text-[10px] font-semibold leading-3 text-white">{displayName}</span><span className="block text-[9px] text-indigo-200/70">{roleLabel}</span></span>
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

        <div className="mobile-nav-shell grid xl:hidden" data-open={menuOpen}>
          <div className="mobile-nav-panel min-h-0 overflow-hidden">
            <nav
              className="border-t border-white/10 bg-indigo-950 px-4 py-3 shadow-2xl"
              aria-label="Mobile navigation"
              aria-hidden={!menuOpen}
              inert={!menuOpen}
            >
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
          </div>
        </div>
      </header>

      <main className="app-main page-enter relative mx-auto max-w-[1600px] p-4 sm:p-6 xl:p-8">
        {showBackButton ? (
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push(secondaryPageFallback(pathname));
            }}
            className="mb-4 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-700"
            aria-label="Back to previous page"
          >
            <ArrowLeft size={15} /> Back
          </button>
        ) : null}
        {children}
      </main>
    </div>
  );
}

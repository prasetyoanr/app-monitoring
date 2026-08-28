"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  Gauge,
  HardDriveDownload,
  FileBarChart,
  Inbox,
  Hourglass,
  LogOut,
  Menu,
  RotateCcw,
  Send,
  UserCog,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { markRequestNotificationsReadAction } from "@/app/notifications/actions";
import type { IssueStatus } from "@/data/types";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  itTeamOnly?: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  reportedAt: string;
  href: string;
  status: IssueStatus;
};

function NotificationStatusMark({ status, index }: { status: IssueStatus; index: number }) {
  if (status === "In Progress") {
    return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600" title="In Progress"><Hourglass size={13} /></span>;
  }
  if (status === "Completed") {
    return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600" title="Completed"><CheckCircle2 size={14} /></span>;
  }
  if (status === "Reopened") {
    return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-600" title="Reopened"><RotateCcw size={13} /></span>;
  }
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white" title="New">{index + 1}</span>;
}

const navigationBase: NavigationItem[] = [
  { label: "Overview", href: "/", icon: Gauge },
  { label: "Request", href: "/requests", icon: Send },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Surveys", href: "/surveys", icon: ClipboardCheck, itTeamOnly: true },
  { label: "Reports", href: "/reports", icon: FileBarChart, itTeamOnly: true },
  { label: "Backup User", href: "/backups", icon: HardDriveDownload, itTeamOnly: true },
];

const primaryPagePaths = new Set([
  "/",
  "/inbox",
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
  counts: { issues: number; backups: number; newRequests: number; inProgressRequests: number; unreadRequestNotifications: number };
  notifications: { inbox: NotificationItem[]; request: NotificationItem[] };
  user: {
    name: string;
    username: string;
    role: "administrator" | "boss" | "technician" | "requester";
    divisionId?: string | null;
    divisionName?: string | null;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [readRequestNotificationSignature, setReadRequestNotificationSignature] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const requestNotificationReadAttemptRef = useRef<string | null>(null);
  const normalizedDivision = user.divisionName?.trim().toLowerCase() ?? "";
  const isIT =
    user.role === "administrator" ||
    normalizedDivision === "it team" ||
    normalizedDivision === "it" ||
    normalizedDivision.includes("information technology") ||
    normalizedDivision.startsWith("it");
  const useSplitNotifications = user.role !== "administrator";
  const requestNotificationSignature = notifications.request
    .map((notification) => notification.id)
    .join("|");
  const requestNotificationsReadLocally =
    counts.unreadRequestNotifications === 0 ||
    (requestNotificationSignature.length > 0 &&
      readRequestNotificationSignature === requestNotificationSignature);

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

  useEffect(() => {
    if (
      !useSplitNotifications ||
      !pathname.startsWith("/requests") ||
      counts.unreadRequestNotifications === 0 ||
      requestNotificationSignature.length === 0 ||
      requestNotificationsReadLocally ||
      requestNotificationReadAttemptRef.current === requestNotificationSignature
    ) {
      return;
    }

    requestNotificationReadAttemptRef.current = requestNotificationSignature;
    void markRequestNotificationsReadAction().then((result) => {
      if (result.ok) setReadRequestNotificationSignature(requestNotificationSignature);
      if (requestNotificationReadAttemptRef.current === requestNotificationSignature) {
        requestNotificationReadAttemptRef.current = null;
      }
    });
  }, [
    counts.unreadRequestNotifications,
    pathname,
    requestNotificationSignature,
    requestNotificationsReadLocally,
    useSplitNotifications,
  ]);

  const themeClass =
    user.role === "administrator"
      ? "theme-admin"
      : isIT
        ? "theme-it"
        : "theme-logo";

  const roleLabel =
    user.role === "administrator"
      ? "Administrator"
      : user.role === "boss"
        ? "Atasan"
        : "Staf";

  const divisionLabel = user.divisionName ? `${user.divisionName}` : "";

  const displayName = user.name || user.username;
  const unreadRequestNotificationCount = requestNotificationsReadLocally
    ? 0
    : counts.unreadRequestNotifications;
  const visibleRequestNotifications = requestNotificationsReadLocally
    ? []
    : notifications.request;
  const notificationCount =
    counts.newRequests + (useSplitNotifications ? unreadRequestNotificationCount : 0);
  const legacyInboxNotifications = notifications.inbox.filter(
    (notification) => notification.status === "New",
  );
  const combinedNotifications = [
    ...notifications.inbox.map((notification) => ({ ...notification, source: "Inbox" as const })),
    ...visibleRequestNotifications.map((notification) => ({ ...notification, source: "Request" as const })),
  ];
  const navigation = navigationBase
    .filter((item) => !item.itTeamOnly || isIT)
    .map((item) => ({
      ...item,
      count:
        item.href === "/backups"
          ? counts.backups
          : undefined,
    }));
  const showBackButton = !primaryPagePaths.has(pathname);

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/b/") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/inbox/approval/") ||
    pathname.startsWith("/backups/submit/")
  ) {
    return <>{children}</>;
  }

  return (
    <div className={`app-shell ${themeClass}`}>
      <header className="app-navbar sticky top-0 z-40 border-b border-white/10 bg-indigo-950 text-white">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 xl:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <span className="grid size-10 place-items-center">
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
                  className={`nav-link relative flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[11px] font-semibold transition ${active ? "bg-white text-indigo-700 shadow-lg shadow-indigo-950/20" : "text-indigo-100/75 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={15} strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user.role === "administrator" || user.role === "boss" || user.role === "technician" || user.role === "requester" ? (
              <div ref={notificationRef} className="relative">
                <button type="button" onClick={() => setNotificationOpen((open) => !open)} className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-indigo-100/80 transition hover:border-cyan-300/30 hover:bg-white/15 hover:text-white" aria-label={notificationCount > 0 ? `${notificationCount} notifikasi baru` : "Notifikasi"} aria-expanded={notificationOpen} aria-haspopup="dialog" title="Notifikasi">
                  <Bell size={17} />
                  {notificationCount > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white ring-1 ring-white">{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
                </button>
                {notificationOpen ? (
                  useSplitNotifications ? (
                    <div className="fixed inset-x-3 top-20 z-50 w-auto overflow-hidden rounded-2xl border border-indigo-100 bg-white text-slate-700 shadow-2xl shadow-indigo-950/25 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[min(24rem,calc(100vw-2rem))]" role="dialog" aria-label="Notifikasi laporan dan perubahan status">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold text-slate-800">Notifikasi</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">Laporan masuk dan perubahan status terbaru</p>
                      </div>
                      {combinedNotifications.length > 0 ? <div className="max-h-[calc(100dvh-10rem)] divide-y divide-slate-100 overflow-y-auto sm:max-h-80">{combinedNotifications.map((notification) => <Link key={`${notification.source}-${notification.id}`} href={notification.href} onClick={() => setNotificationOpen(false)} className="block px-4 py-3 transition hover:bg-indigo-50"><span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">{notification.title}</span><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${notification.source === "Inbox" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{notification.source}</span></span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{notification.description}</span><span className="mt-1 block text-[9px] text-slate-400">{notification.reportedAt}</span></Link>)}</div> : <div className="px-4 py-7 text-center text-[11px] text-slate-400">Tidak ada notifikasi baru.</div>}
                    </div>
                  ) : (
                    <div className="fixed inset-x-3 top-20 z-50 w-auto overflow-hidden rounded-2xl border border-indigo-100 bg-white text-slate-700 shadow-2xl shadow-indigo-950/25 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[min(22rem,calc(100vw-2rem))]" role="dialog" aria-label="Notifikasi permintaan baru">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-bold text-slate-700">{counts.newRequests > 0 ? `${counts.newRequests} permintaan baru` : "Tidak ada permintaan baru"}</p>
                      </div>
                      {legacyInboxNotifications.length > 0 ? <div className="max-h-[calc(100dvh-10rem)] divide-y divide-slate-100 overflow-y-auto sm:max-h-80">{legacyInboxNotifications.map((notification, index) => <Link key={notification.id} href={notification.href} onClick={() => setNotificationOpen(false)} className="flex gap-3 px-4 py-3 transition hover:bg-indigo-50"><NotificationStatusMark status={notification.status} index={index} /><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-slate-800">{notification.title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{notification.description}</span><span className="mt-1 block text-[9px] text-slate-400">{notification.reportedAt}</span></span></Link>)}</div> : <div className="px-4 py-7 text-center text-[11px] text-slate-400">Belum ada permintaan baru.</div>}
                    </div>
                  )
                ) : null}
              </div>
            ) : null}
            <div ref={userMenuRef} className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex min-h-10 items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-left hover:border-cyan-300/30 hover:bg-white/15"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <UserRound size={18} className="shrink-0 text-white/85" />
                <span><span className="block max-w-28 truncate text-[10px] font-semibold leading-3 text-white">{displayName}</span><span className="block text-[9px] text-indigo-200/70">{roleLabel} {divisionLabel}</span></span>
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
                  return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`relative flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold ${active ? "bg-white text-indigo-700 shadow-lg" : "text-indigo-100/75 hover:bg-white/10 hover:text-white"}`}><Icon size={17} /><span className="flex-1">{item.label}</span>{item.count ? <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${active ? "bg-indigo-100" : "bg-white/10"}`}>{item.count}</span> : null}</Link>;
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

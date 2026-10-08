"use client";

import Image from "next/image";
import Link from "next/link";
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
  Inbox,
  HeartPulse,
  LogOut,
  Menu,
  RefreshCw,
  ScrollText,
  Send,
  UserCog,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { logoutAction } from "@/app/login/actions";
import { markRequestNotificationsReadAction, markWorkflowNotificationsReadAction } from "@/app/notifications/actions";
import { IssueLiveSync } from "@/components/issue-live-sync";
import type { AccountRole, IssueStatus } from "@/data/types";
import type { AdminAlert } from "@/lib/admin-alerts";
import { isGaDivisionSlug } from "@/lib/request-destination";

type NavigationItem = {
  label: string;
  mobileLabel?: string;
  href: string;
  icon: LucideIcon;
  itTeamOnly?: boolean;
  itRoleOnly?: boolean;
  administratorOnly?: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  reportedAt: string;
  href: string;
  status: IssueStatus;
};

const navigationBase: NavigationItem[] = [
  { label: "Overview", mobileLabel: "Home", href: "/", icon: Gauge },
  { label: "Request", href: "/requests", icon: Send },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "GA Activities", mobileLabel: "Activities", href: "/activities", icon: ClipboardCheck },
  { label: "Surveys", href: "/surveys", icon: ClipboardCheck, itRoleOnly: true },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Log", href: "/audit-logs", icon: ScrollText, administratorOnly: true },
  { label: "Backup User", mobileLabel: "Backup", href: "/backups", icon: HardDriveDownload, itRoleOnly: true },
];

const utilityNavigation: NavigationItem[] = [
  { label: "Admin Operations", mobileLabel: "Operations", href: "/admin-operations", icon: Wrench, administratorOnly: true },
  { label: "System Health", mobileLabel: "Health", href: "/system-health", icon: HeartPulse, administratorOnly: true },
];

const primaryPagePaths = new Set([
  "/",
  "/inbox",
  "/activities",
  "/requests",
  "/backups",
  "/surveys",
  "/reports",
  "/audit-logs",
  "/admin-operations",
  "/system-health",
]);

function secondaryPageFallback(pathname: string) {
  const feature = pathname.split("/").filter(Boolean)[0];
  return [...navigationBase, ...utilityNavigation].some((item) => item.href === `/${feature}`)
    ? `/${feature}`
    : "/";
}

function isNavigationItemActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({
  children,
  counts,
  notifications,
  user,
}: {
  children: React.ReactNode;
  counts: { issues: number; backups: number; newRequests: number; inProgressRequests: number; unreadRequestNotifications: number; unreadWorkflowNotifications: number };
  notifications: { inbox: NotificationItem[]; request: NotificationItem[]; workflow: NotificationItem[]; admin: AdminAlert[] };
  user: {
    name: string;
    username: string;
    role: AccountRole;
    divisionId?: string | null;
    divisionName?: string | null;
    divisionSlug?: string | null;
    isGaUnit?: boolean;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [readRequestNotificationSignature, setReadRequestNotificationSignature] = useState<string | null>(null);
  const [readWorkflowIds, setReadWorkflowIds] = useState<ReadonlySet<string>>(new Set());
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
  const isITRole =
    user.role !== "administrator" &&
    ["service_agent", "approver"].includes(user.role) &&
    isIT;
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
    if (!utilityOpen) return;

    function closeUtilityMenu(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-utility-menu]")) {
        setUtilityOpen(false);
      }
    }

    function closeUtilityMenuWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setUtilityOpen(false);
    }

    document.addEventListener("pointerdown", closeUtilityMenu);
    document.addEventListener("keydown", closeUtilityMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeUtilityMenu);
      document.removeEventListener("keydown", closeUtilityMenuWithKeyboard);
    };
  }, [utilityOpen]);

  useEffect(() => {
    if (
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
      : user.role === "receptionist"
        ? "Admin"
        : user.role === "approver"
          ? "First Approval"
          : user.role === "final_approver"
            ? "Final Approval"
            : user.role === "service_agent"
              ? "Staff"
              : "Requester";

  const divisionLabel = user.divisionName ? `${user.divisionName}` : "";
  const userMetaLabel = divisionLabel ? `${divisionLabel} · ${roleLabel}` : roleLabel;

  const displayName = user.name || user.username;
  const unreadRequestNotificationCount = requestNotificationsReadLocally
    ? 0
    : counts.unreadRequestNotifications;
  const visibleRequestNotifications = requestNotificationsReadLocally
    ? []
    : notifications.request;
  const visibleWorkflowNotifications = notifications.workflow.filter((notification) => !readWorkflowIds.has(notification.id));
  const unreadWorkflowCount = Math.max(
    0,
    counts.unreadWorkflowNotifications - (notifications.workflow.length - visibleWorkflowNotifications.length),
  );
  const markWorkflowRead = (id?: string) => {
    setReadWorkflowIds((current) => new Set([...current, ...(id ? [id] : notifications.workflow.map((notification) => notification.id))]));
    void markWorkflowNotificationsReadAction(id);
  };
  // The administrator's bell lists conditions that need action; the count is the number of
  // active alerts, and the latest tickets below them are informational only.
  const isAdministrator = user.role === "administrator";
  const adminAlerts = isAdministrator ? notifications.admin : [];
  const notificationCount = isAdministrator
    ? adminAlerts.length
    : counts.newRequests + unreadRequestNotificationCount + unreadWorkflowCount;
  const combinedNotifications = [
    ...adminAlerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      reportedAt: alert.severity === "critical" ? "Needs attention now" : "Needs follow-up",
      href: alert.href,
      source: "Alert" as const,
      severity: alert.severity,
    })),
    ...visibleWorkflowNotifications.map((notification) => ({ ...notification, source: "Workflow" as const })),
    ...notifications.inbox.map((notification) => ({ ...notification, source: "Inbox" as const })),
    ...visibleRequestNotifications.map((notification) => ({ ...notification, source: "Request" as const })),
  ];
  const navigation = navigationBase
    .filter((item) => item.href !== "/activities" || (user.role === "administrator" || (!isIT && (["approver", "final_approver"].includes(user.role) || (user.role === "receptionist" && isGaDivisionSlug(user.divisionSlug)) || (user.role === "service_agent" && user.isGaUnit)))))
    .filter((item) => item.href !== "/inbox" || user.role !== "requester")
    .filter((item) => item.href !== "/reports" || user.role !== "requester")
    .filter((item) => item.href !== "/requests" || user.role !== "administrator")
    .filter((item) => !item.itTeamOnly || (isIT && ["administrator", "service_agent", "approver"].includes(user.role)))
    .filter((item) => !item.itRoleOnly || isITRole)
    .filter((item) => !item.administratorOnly || user.role === "administrator")
    .map((item) => ({
      ...item,
      count:
        item.href === "/backups"
          ? counts.backups
          : undefined,
    }));
  const utilityActive = utilityNavigation.some((item) => isNavigationItemActive(pathname, item.href));
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
      <IssueLiveSync />
      <header className="app-navbar sticky top-0 z-40 border-b border-white/10 bg-indigo-950 text-white">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 xl:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <Image src="/logo.png" alt="" aria-hidden="true" priority width={40} height={40} className="size-10 rounded-full" />
            <span className="min-w-0">
              <span className="block text-[13px] font-extrabold leading-4 tracking-tight text-white">GA Management</span>
              <span className="block text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-200/70 sm:text-[9px] sm:tracking-[0.16em]">GA Services and Activities</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 xl:flex" aria-label="Main navigation">
            {navigation.map((item) => {
              const active = isNavigationItemActive(pathname, item.href);
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
            {user.role === "administrator" ? (
              <div className="relative" data-utility-menu>
                <button
                  type="button"
                  onClick={() => setUtilityOpen((open) => !open)}
                  data-active={utilityActive}
                  aria-expanded={utilityOpen}
                  aria-haspopup="menu"
                  className={`nav-link relative flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[11px] font-semibold transition ${utilityActive ? "bg-white text-indigo-700 shadow-lg shadow-indigo-950/20" : "text-indigo-100/75 hover:bg-white/10 hover:text-white"}`}
                >
                  <Wrench size={15} strokeWidth={utilityActive ? 2.4 : 2} />
                  Utility
                  <ChevronDown size={13} className={`transition ${utilityOpen ? "rotate-180" : ""}`} />
                </button>
                {utilityOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-indigo-100 bg-white p-2 text-slate-700 shadow-2xl shadow-indigo-950/25" role="menu">
                    {utilityNavigation.map((item) => { const Icon = item.icon; const active = isNavigationItemActive(pathname, item.href); return <Link key={item.href} href={item.href} onClick={() => setUtilityOpen(false)} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold transition ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`} role="menuitem"><Icon size={16} /><span>{item.label}</span></Link>; })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setUserMenuOpen(false);
                setNotificationOpen(false);
                startRefreshTransition(() => router.refresh());
              }}
              disabled={isRefreshing}
              className="group relative grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-indigo-100/80 transition hover:border-cyan-300/30 hover:bg-white/15 hover:text-white disabled:cursor-wait disabled:text-cyan-200"
              aria-label={isRefreshing ? "Refreshing data" : "Refresh page data"}
              aria-busy={isRefreshing}
              title={isRefreshing ? "Refreshing data..." : "Refresh data"}
            >
              <span className={isRefreshing ? "animate-spin motion-reduce:animate-none" : "transition-transform duration-300 group-hover:rotate-45 motion-reduce:transform-none"}>
                <RefreshCw size={17} />
              </span>
              <span className="sr-only" aria-live="polite">{isRefreshing ? "Data is being refreshed" : ""}</span>
            </button>
            <div ref={notificationRef} className="relative">
                <button type="button" onClick={() => setNotificationOpen((open) => !open)} className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-indigo-100/80 transition hover:border-cyan-300/30 hover:bg-white/15 hover:text-white" aria-label={notificationCount > 0 ? `${notificationCount} new notifications` : "Notifications"} aria-expanded={notificationOpen} aria-haspopup="dialog" title="Notifications">
                  <Bell size={17} />
                  {notificationCount > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white ring-1 ring-white">{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
                </button>
                {notificationOpen ? (
                    <div className="fixed inset-x-3 top-20 z-50 w-auto overflow-hidden rounded-2xl border border-indigo-100 bg-white text-slate-700 shadow-2xl shadow-indigo-950/25 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[min(24rem,calc(100vw-2rem))]" role="dialog" aria-label="Request and status-change notifications">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-bold text-slate-800">Notifications</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{isAdministrator ? (adminAlerts.length ? "Alerts that need your action, then the latest requests" : "All clear · latest requests below") : "Latest incoming requests and status changes"}</p>
                        {visibleWorkflowNotifications.length > 0 ? <button type="button" onClick={() => markWorkflowRead()} className="mt-1.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800">Mark task alerts as read</button> : null}
                      </div>
                      {combinedNotifications.length > 0 ? <div className="max-h-[calc(100dvh-10rem)] divide-y divide-slate-100 overflow-y-auto sm:max-h-80">{combinedNotifications.map((notification) => <Link key={`${notification.source}-${notification.id}`} href={notification.href} onClick={() => { setNotificationOpen(false); if (notification.source === "Workflow") markWorkflowRead(notification.id); }} className="block px-4 py-3 transition hover:bg-indigo-50"><span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">{notification.title}</span><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${notification.source === "Alert" ? ("severity" in notification && notification.severity === "critical" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700") : notification.source === "Inbox" ? "bg-blue-50 text-blue-600" : notification.source === "Workflow" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-600"}`}>{notification.source}</span></span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{notification.description}</span><span className="mt-1 block text-[9px] text-slate-400">{notification.reportedAt}</span></Link>)}</div> : <div className="px-4 py-7 text-center text-[11px] text-slate-400">No new notifications.</div>}
                    </div>
                ) : null}
            </div>
            <div ref={userMenuRef} className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex min-h-10 items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-left hover:border-cyan-300/30 hover:bg-white/15"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <UserRound size={18} className="shrink-0 text-white/85" />
                <span><span className="block max-w-28 truncate text-[10px] font-semibold leading-3 text-white">{displayName}</span><span className="block max-w-40 truncate text-[9px] text-indigo-200/70" title={userMetaLabel}>{userMetaLabel}</span></span>
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
            <button onClick={() => setMenuOpen((open) => !open)} className="hidden size-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15 sm:grid xl:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div
          className="mobile-nav-shell grid xl:hidden"
          data-open={menuOpen}
          onClick={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <div className="mobile-nav-panel min-h-0 overflow-hidden">
            <nav
              className="border-t border-white/10 bg-indigo-950 px-4 py-3 shadow-2xl"
              aria-label="Mobile navigation"
              aria-hidden={!menuOpen}
              inert={!menuOpen}
            >
              <div className="mx-auto grid max-w-[1600px] gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {navigation.map((item) => {
                  const active = isNavigationItemActive(pathname, item.href);
                  const Icon = item.icon;
                  return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`relative flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold ${active ? "bg-white text-indigo-700 shadow-lg" : "text-indigo-100/75 hover:bg-white/10 hover:text-white"}`}><Icon size={17} /><span className="flex-1">{item.label}</span>{item.count ? <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${active ? "bg-indigo-100" : "bg-white/10"}`}>{item.count}</span> : null}</Link>;
                })}
                {user.role === "administrator" ? <div className="sm:col-span-2 lg:col-span-3" data-utility-menu><button type="button" onClick={() => setUtilityOpen((open) => !open)} aria-expanded={utilityOpen} aria-haspopup="menu" className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold ${utilityActive ? "bg-white text-indigo-700 shadow-lg" : "text-indigo-100/75 hover:bg-white/10 hover:text-white"}`}><Wrench size={17} /><span className="flex-1 text-left">Utility</span><ChevronDown size={14} className={`transition ${utilityOpen ? "rotate-180" : ""}`} /></button>{utilityOpen ? <div className="mt-1 grid gap-1 rounded-xl bg-white/5 p-1 sm:grid-cols-2">{utilityNavigation.map((item) => { const Icon = item.icon; const active = isNavigationItemActive(pathname, item.href); return <Link key={item.href} href={item.href} onClick={() => { setUtilityOpen(false); setMenuOpen(false); }} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[11px] font-semibold ${active ? "bg-white text-indigo-700" : "text-indigo-100 hover:bg-white/10"}`}><Icon size={15} />{item.label}</Link>; })}</div> : null}</div> : null}
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

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 px-3 sm:hidden" aria-label="Mobile primary navigation">
        {user.role === "administrator" && utilityOpen ? <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[60] w-[min(15rem,calc(100vw-2rem))] rounded-2xl border border-indigo-100 bg-white p-2 text-slate-700 shadow-2xl shadow-indigo-950/25" role="menu" data-utility-menu>{utilityNavigation.map((item) => { const Icon = item.icon; const active = isNavigationItemActive(pathname, item.href); return <Link key={item.href} href={item.href} onClick={() => setUtilityOpen(false)} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`} role="menuitem"><Icon size={16} />{item.label}</Link>; })}</div> : null}
        <div className="mobile-bottom-surface mx-auto max-w-md overflow-hidden border border-white/80 bg-white/95 backdrop-blur-xl">
          <div className="mobile-bottom-track flex min-w-full items-stretch overflow-x-auto overscroll-x-contain px-2">
            {navigation.map((item) => {
              const active = isNavigationItemActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className="mobile-bottom-item"
                >
                  <span className="mobile-bottom-icon relative grid place-items-center">
                    <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                    {item.count ? <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[8px] leading-4 text-white">{item.count > 99 ? "99+" : item.count}</span> : null}
                  </span>
                  <span className="mobile-bottom-label" title={item.label}>{item.mobileLabel ?? item.label}</span>
                </Link>
              );
            })}
            {user.role === "administrator" ? <div className="mobile-bottom-action" data-utility-menu><button type="button" onClick={() => setUtilityOpen((open) => !open)} data-active={utilityActive} aria-expanded={utilityOpen} aria-haspopup="menu" className="mobile-bottom-item"><span className="mobile-bottom-icon grid place-items-center"><Wrench size={19} strokeWidth={utilityActive ? 2.5 : 2} /></span><span className="mobile-bottom-label">Utility</span></button></div> : null}
            {user.role === "administrator" ? <><Link href="/master-data" onClick={() => setUtilityOpen(false)} data-active={isNavigationItemActive(pathname, "/master-data")} aria-current={isNavigationItemActive(pathname, "/master-data") ? "page" : undefined} className="mobile-bottom-item"><span className="mobile-bottom-icon grid place-items-center"><Database size={19} /></span><span className="mobile-bottom-label">Master</span></Link><Link href="/accounts" onClick={() => setUtilityOpen(false)} data-active={isNavigationItemActive(pathname, "/accounts")} aria-current={isNavigationItemActive(pathname, "/accounts") ? "page" : undefined} className="mobile-bottom-item"><span className="mobile-bottom-icon grid place-items-center"><UserCog size={19} /></span><span className="mobile-bottom-label">Account</span></Link></> : null}
            <form action={logoutAction} className="mobile-bottom-action">
              <button type="submit" className="mobile-bottom-item">
                <span className="mobile-bottom-icon grid place-items-center"><LogOut size={19} /></span>
                <span className="mobile-bottom-label">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </nav>
    </div>
  );
}

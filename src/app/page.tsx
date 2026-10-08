import Link from "next/link";
import { Activity, ArrowRight, ChevronDown, ChevronRight, CircleCheck, Clock3, FileText, Inbox, Plus, ShieldAlert, TicketCheck, UserRoundCheck } from "lucide-react";
import { isITTeamUser } from "@/auth/session";
import { AdminOverview, type AdminTile } from "@/components/admin-overview";
import { Card, MetricCard, SectionTitle, StatusBadge } from "@/components/ui";
import { getDashboardData } from "@/data/dashboard-data";
import { ticketStatusLabel } from "@/lib/request-workflow";

export default async function DashboardPage() {
  const {
    recentIssues: tickets,
    currentUser,
    canAccessBackups,
    activeIssues,
    completedIssues,
    backupTotal,
    backupSuccess,
    failedBackups,
    overdueBackups,
    adminControl,
  } = await getDashboardData();
  const backupIssues = backupTotal - backupSuccess;
  const issueTotal = activeIssues + completedIssues;
  const completionRate = issueTotal ? Math.round((completedIssues / issueTotal) * 100) : 0;
  const activeShare = issueTotal ? Math.round((activeIssues / issueTotal) * 100) : 0;
  const backupRate = backupTotal ? Math.round((backupSuccess / backupTotal) * 100) : 0;
  const isRequester = currentUser.role === "requester";
  const isAdmin = currentUser.role === "administrator";
  // The overview follows each role's navbar: IT = indigo-950, administrator = slate,
  // every other role (GA staff, approvers, requesters) = the GA green (#004d32).
  const isItTheme = !isAdmin && !isRequester && isITTeamUser(currentUser);
  const isGaTheme = !isAdmin && !isItTheme;
  const solid = isGaTheme ? "bg-[#004d32]" : isItTheme ? "bg-indigo-950" : "bg-slate-900";
  const solidHover = isGaTheme ? "hover:bg-[#003d28]" : isItTheme ? "hover:bg-indigo-900" : "hover:bg-slate-700";
  const solidGroupHover = isGaTheme ? "group-hover:bg-[#004d32]" : isItTheme ? "group-hover:bg-indigo-950" : "group-hover:bg-slate-900";
  const accentBar = "bg-amber-400";
  const primaryBtn = isGaTheme
    ? "bg-amber-400 text-[#004d32] hover:bg-amber-300"
    : isItTheme
      ? "bg-amber-400 text-indigo-950 hover:bg-amber-300"
      : "bg-amber-400 text-slate-900 hover:bg-amber-300";
  const mutedOnSolid = isGaTheme ? "text-emerald-200" : isItTheme ? "text-indigo-200" : "text-slate-400";
  const bodyOnSolid = isGaTheme ? "text-emerald-100" : isItTheme ? "text-indigo-100" : "text-slate-300";
  // Interactive accents in the page body (links, progress, focus rings).
  const brandTile = isGaTheme ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-600";
  const brandHover = isGaTheme ? "hover:border-emerald-200 hover:bg-emerald-50/50" : "hover:border-indigo-200 hover:bg-indigo-50/50";
  const brandBar = isGaTheme ? "bg-teal-600" : "bg-indigo-600";
  const brandFocus = isGaTheme ? "focus-visible:outline-emerald-700" : "focus-visible:outline-indigo-600";
  const brandLinkHover = isGaTheme ? "hover:text-emerald-700" : "hover:text-indigo-600";
  const brandIconHover = isGaTheme ? "hover:bg-emerald-700" : "hover:bg-indigo-600";
  const brandCta = isGaTheme ? "bg-[#004d32] hover:bg-[#003d28]" : "bg-indigo-600 hover:bg-indigo-700";
  const inboxHref = isRequester ? "/requests" : "/inbox";
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const compactDateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(now);

  const quickActions = isRequester
    ? [
        { href: "/requests", label: "Buat permintaan", icon: Plus, primary: true },
        { href: "/surveys", label: "Isi survei", icon: FileText, primary: false },
      ]
    : isAdmin
      ? [
          { href: "/inbox", label: "Buka Inbox", icon: Inbox, primary: true },
          { href: "/admin-operations", label: "Operasional", icon: Activity, primary: false },
        ]
      : [
          { href: "/inbox", label: "Buka Inbox", icon: Inbox, primary: true },
          { href: "/reports", label: "Pusat laporan", icon: FileText, primary: false },
        ];

  const attentionItems = [
    activeIssues > 0
      ? {
          href: inboxHref,
          label: `${activeIssues} isu aktif`,
          sub: `${completionRate}% selesai dari ${issueTotal} total`,
          icon: TicketCheck,
          tile: brandTile,
          hover: brandHover,
        }
      : null,
    canAccessBackups && backupIssues > 0
      ? {
          href: "/backups",
          label: `${backupIssues} backup bermasalah`,
          sub: `Gagal ${failedBackups} · Overdue ${overdueBackups}`,
          icon: CircleCheck,
          tile: "bg-rose-50 text-rose-600",
          hover: "hover:border-rose-200 hover:bg-rose-50/50",
        }
      : null,
    adminControl && adminControl.stalled > 0
      ? {
          href: "/admin-operations?view=stalled",
          label: `${adminControl.stalled} pekerjaan macet`,
          sub: "Tak ada update > 3 hari",
          icon: Clock3,
          tile: "bg-amber-50 text-amber-600",
          hover: "hover:border-amber-200 hover:bg-amber-50/50",
        }
      : null,
    adminControl && adminControl.unassigned > 0
      ? {
          href: "/inbox?workflow=ready_for_assignment",
          label: `${adminControl.unassigned} menunggu assignment`,
          sub: "Siap diteruskan ke teknisi",
          icon: UserRoundCheck,
          tile: brandTile,
          hover: brandHover,
        }
      : null,
    adminControl && adminControl.lockedAccounts > 0
      ? {
          href: "/accounts?status=locked",
          label: `${adminControl.lockedAccounts} akun terkunci`,
          sub: "Perlu dibuka atau ditinjau",
          icon: ShieldAlert,
          tile: "bg-rose-50 text-rose-600",
          hover: "hover:border-rose-200 hover:bg-rose-50/50",
        }
      : null,
    adminControl && adminControl.failedLogins > 0
      ? {
          href: "/audit-logs?event=failed_login&period=24h",
          label: `${adminControl.failedLogins} login gagal (24 jam)`,
          sub: "Periksa aktivitas mencurigakan",
          icon: Activity,
          tile: "bg-rose-50 text-rose-600",
          hover: "hover:border-rose-200 hover:bg-rose-50/50",
        }
      : null,
  ].filter((item): item is { href: string; label: string; sub: string; icon: typeof TicketCheck; tile: string; hover: string } => item !== null);

  // The administrator gets a compact, interactive overview of its own.
  if (isAdmin && adminControl) {
    // Failed sign-ins only count as an alert from 5 attempts, like the notification bell.
    const tiles: AdminTile[] = [
      { id: "intake", group: "workflow", label: "Admin", hint: "Intake dan revisi", value: adminControl.gaAdmin, href: "/inbox?workflow=intake", severity: "info" },
      { id: "first", group: "workflow", label: "First Approval", hint: "Menunggu persetujuan", value: adminControl.gaSupervisor, href: "/inbox?workflow=waiting_approver", severity: "info" },
      { id: "final", group: "workflow", label: "Final Approval", hint: "Menunggu persetujuan akhir", value: adminControl.seniorApprover, href: "/inbox?workflow=waiting_final_approver", severity: "info" },
      { id: "assign", group: "workflow", label: "Menunggu assignment", hint: "Siap ditugaskan ke staf", value: adminControl.unassigned, href: "/inbox?workflow=ready_for_assignment", severity: "warning" },
      { id: "stalled", group: "operations", label: "Pekerjaan macet", hint: "Tanpa update lebih dari 3 hari", value: adminControl.stalled, href: "/admin-operations?view=stalled", severity: "warning" },
      { id: "locked", group: "operations", label: "Akun terkunci", hint: "Perlu dibuka atau ditinjau", value: adminControl.lockedAccounts, href: "/accounts?status=locked", severity: "critical" },
      { id: "failed", group: "security", label: "Login gagal", hint: "24 jam terakhir", value: adminControl.failedLogins, href: "/audit-logs?event=failed_login&period=24h", severity: adminControl.failedLogins >= 5 ? "critical" : "info" },
      { id: "denied", group: "security", label: "Akses ditolak", hint: "24 jam terakhir", value: adminControl.deniedAttempts, href: "/audit-logs?event=authorization_denied&period=24h", severity: "warning" },
      { id: "sensitive", group: "security", label: "Akses data sensitif", hint: "24 jam terakhir", value: adminControl.sensitiveAccess, href: "/audit-logs?event=sensitive_access&period=24h", severity: "info" },
    ];
    return (
      <AdminOverview
        firstName={currentUser.name.split(" ")[0]}
        dateLabel={todayLabel}
        compactDateLabel={compactDateLabel}
        timeLabel={timeLabel}
        activeIssues={activeIssues}
        completionRate={completionRate}
        tiles={tiles}
        tickets={tickets.slice(0, 4).map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          category: ticket.category,
          location: ticket.location,
          statusLabel: ticketStatusLabel(ticket),
          statusTone: ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber",
          completion: ticket.completedDays === null ? "Belum selesai" : ticket.completedDays === 0 ? "Hari yang sama" : `${ticket.completedDays} hari`,
        }))}
      />
    );
  }

  // The Inbox has no per-ticket page; open the list instead of a 404.
  const ticketHref = () => (isRequester ? "/requests" : "/inbox");
  const ticketEdge = (status: string) => status === "Completed" ? "border-emerald-500" : status === "In Progress" ? "border-indigo-500" : "border-amber-400";

  return (
    <>
      <header className={`mb-5 overflow-hidden rounded-3xl ${solid} p-5 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.5)] sm:mb-6 sm:p-7`}>
        <span aria-hidden="true" className={`block h-1 w-16 rounded-full ${accentBar}`} />
        <div className="mt-4 flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] ${mutedOnSolid}`}>
              Overview · {isAdmin ? "Administrator" : isRequester ? "Requester" : "Support Team"}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[9px] normal-case tracking-normal text-slate-200">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="sm:hidden">{compactDateLabel} · {timeLabel}</span><span className="hidden sm:inline">{todayLabel} · {timeLabel} WIB</span>
              </span>
            </p>
            <h1 className="mt-2.5 truncate text-2xl font-black tracking-[-0.03em] sm:text-[32px]">Welcome back, {currentUser.name.split(" ")[0]}</h1>
            <p className={`mt-1.5 text-[13px] leading-6 ${bodyOnSolid}`}>Here&apos;s what needs your eyes today — active work, completions, and priorities.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white"><span className={`size-1.5 rounded-full ${isGaTheme ? "bg-emerald-300" : "bg-indigo-300"}`} />{activeIssues} aktif</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white"><span className="size-1.5 rounded-full bg-emerald-300" />{completionRate}% selesai</span>
              {canAccessBackups ? <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white"><span className="size-1.5 rounded-full bg-amber-300" />Backup {backupRate}%</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            {quickActions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className={action.primary
                  ? `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold transition active:scale-[0.98] ${primaryBtn}`
                  : "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-xs font-bold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/20 active:scale-[0.98]"}
              >
                <action.icon size={15} />{action.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className={`grid gap-2 sm:gap-4 ${canAccessBackups ? "grid-cols-3" : "grid-cols-2"}`}>
        <Link href={inboxHref} className={`block rounded-2xl transition duration-150 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.14)] focus-visible:outline focus-visible:outline-2 ${brandFocus}`}>
          <MetricCard compactOnMobile label="Active Issues" value={String(activeIssues)} icon={TicketCheck} tone={isGaTheme ? "teal" : "blue"} detail={<span className="block">{activeShare}% dari {issueTotal} total<span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${brandBar}`} style={{ width: `${activeShare}%` }} /></span></span>} />
        </Link>
        <Link href={inboxHref} className={`block rounded-2xl transition duration-150 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.14)] focus-visible:outline focus-visible:outline-2 ${brandFocus}`}>
          <MetricCard compactOnMobile label="Completed Issues" value={String(completedIssues)} icon={Clock3} tone="green" detail={<span className="block">{completionRate}% penyelesaian<span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${completionRate}%` }} /></span></span>} />
        </Link>
        {canAccessBackups ? (
          <Link href="/backups" className={`block rounded-2xl transition duration-150 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.14)] focus-visible:outline focus-visible:outline-2 ${brandFocus}`}>
            <MetricCard compactOnMobile label="User Backups" value={`${backupTotal ? ((backupSuccess / backupTotal) * 100).toFixed(1) : "0.0"}%`} icon={CircleCheck} tone="red" detail={<span className="block">Gagal {failedBackups} · Overdue {overdueBackups}<span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${backupRate}%` }} /></span></span>} />
          </Link>
        ) : null}
      </div>

      <Card className="mt-5 overflow-hidden">
        <SectionTitle
          title="Perlu perhatian"
          subtitle="Prioritas tindak lanjut — ketuk untuk membuka"
          action={attentionItems.length ? <span className={`shrink-0 rounded-full ${solid} px-2.5 py-1 text-[10px] font-bold text-white tabular-nums`}>{attentionItems.length} prioritas</span> : null}
        />
        {attentionItems.length ? (
          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
            {attentionItems.map((item) => (
              <Link key={item.label} href={item.href} className={`group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 transition hover:shadow-md active:scale-[0.99] ${item.hover}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.tile}`}><item.icon size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.sub}</span>
                </span>
                <span className={`grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400 transition ${solidGroupHover} group-hover:text-white`}><ChevronRight size={14} /></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 sm:px-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CircleCheck size={19} /></span>
            <div><p className="text-xs font-bold text-slate-800">Semua aman</p><p className="mt-0.5 text-[11px] text-slate-500">Tidak ada antrean atau anomali yang butuh tindakan saat ini.</p></div>
          </div>
        )}
      </Card>

      {adminControl ? (
        <Card className="mt-5 overflow-hidden">
          <SectionTitle title="Admin Control Center" subtitle="System priorities — ketuk judul grup untuk melipat" />
          <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-3">
            {[
              {
                title: "Workflow",
                icon: UserRoundCheck,
                tone: "bg-indigo-600 text-white",
                bar: "bg-indigo-600",
                fill: "bg-indigo-500",
                items: [
                  { href: "/inbox?workflow=intake", label: "Admin", value: adminControl.gaAdmin },
                  { href: "/inbox?workflow=waiting_approver", label: "First Approval", value: adminControl.gaSupervisor },
                  { href: "/inbox?workflow=waiting_final_approver", label: "Final Approval", value: adminControl.seniorApprover },
                  { href: "/inbox?workflow=ready_for_assignment", label: "Awaiting Assignment", value: adminControl.unassigned },
                ],
              },
              {
                title: "Operations",
                icon: Activity,
                tone: "bg-amber-500 text-white",
                bar: "bg-amber-500",
                fill: "bg-amber-400",
                items: [
                  { href: "/admin-operations?view=stalled", label: "Stalled Work", value: adminControl.stalled },
                  { href: "/accounts?status=locked", label: "Locked Accounts", value: adminControl.lockedAccounts },
                ],
              },
              {
                title: "Security · 24h",
                icon: ShieldAlert,
                tone: "bg-rose-600 text-white",
                bar: "bg-rose-600",
                fill: "bg-rose-500",
                items: [
                  { href: "/audit-logs?event=failed_login&period=24h", label: "Failed Logins", value: adminControl.failedLogins },
                  { href: "/audit-logs?event=authorization_denied&period=24h", label: "Denied Attempts", value: adminControl.deniedAttempts },
                  { href: "/audit-logs?event=sensitive_access&period=24h", label: "Sensitive Access", value: adminControl.sensitiveAccess },
                ],
              },
            ].map((group) => {
              const groupTotal = group.items.reduce((sum, item) => sum + item.value, 0);
              const groupMax = Math.max(...group.items.map((item) => item.value), 1);
              return (
                <details key={group.title} open className="group overflow-hidden rounded-xl border border-slate-200/90 bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <span aria-hidden="true" className={`h-6 w-1 rounded-full ${group.bar}`} />
                    <span className={`grid size-7 place-items-center rounded-lg ${group.tone}`}><group.icon size={14} /></span>
                    <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-wide text-slate-700">{group.title}</h3>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">{groupTotal}</span>
                    <ChevronDown size={14} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} className="block px-3 py-2.5 transition hover:bg-slate-50 active:bg-slate-100">
                        <span className="flex items-center gap-2 text-[11px]">
                          <span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span>
                          <strong className="text-sm text-slate-900 tabular-nums">{item.value}</strong>
                          <ArrowRight size={12} className="shrink-0 text-slate-300" />
                        </span>
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-100">
                          <span className={`block h-full rounded-full ${group.fill}`} style={{ width: `${Math.round((item.value / groupMax) * 100)}%` }} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="mt-5">
        <Card className="table-card overflow-hidden">
          <SectionTitle title="Latest Issues" subtitle="Recent service request activity — ketuk baris untuk detail" action={<Link href={inboxHref} className={`inline-flex shrink-0 items-center gap-1 rounded-lg ${solid} px-2.5 py-1.5 text-[11px] font-semibold text-white transition ${solidHover}`}>{isRequester ? "My Requests" : "All records"} <ArrowRight size={13} /></Link>} />
          {tickets.length ? (
            <>
              <div className="divide-y divide-slate-100 md:hidden">
                {tickets.slice(0, 4).map((ticket, index) => (
                  <Link
                    key={ticket.id}
                    href={ticketHref()}
                    className={`block border-l-4 p-4 transition hover:bg-slate-50 active:bg-slate-100 ${ticketEdge(ticket.status)} ${index === 2 ? "hidden sm:block" : index === 3 ? "hidden md:block" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xs font-semibold leading-5 text-slate-800">{ticket.title}</h3><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id}</p></div><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber"}>{ticketStatusLabel(ticket)}</StatusBadge></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge><span className="text-[10px] text-slate-500">{ticket.category}</span><span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">{ticket.completedDays === null ? "Not completed" : ticket.completedDays === 0 ? "Same day" : `${ticket.completedDays} days`}<ChevronRight size={12} className="text-slate-300" /></span></div>
                  </Link>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-slate-50/80 text-[9px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Record</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Completion Time</th><th className="px-5 py-3"><span className="sr-only">Open</span></th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.slice(0, 4).map((ticket) => (
                      <tr key={ticket.id} className="text-xs transition hover:bg-slate-50"><td className="px-5 py-3.5"><Link href={ticketHref()} className={`font-semibold text-slate-800 transition ${brandLinkHover}`}>{ticket.title}</Link><p className="mt-1 font-mono text-[9px] text-slate-400">{ticket.id}</p></td><td className="px-4 py-3.5"><StatusBadge tone={ticket.location === "HO" ? "blue" : "gray"}>{ticket.location}</StatusBadge></td><td className="px-4 py-3.5 text-slate-500">{ticket.category}</td><td className="px-4 py-3.5"><StatusBadge tone={ticket.status === "Completed" ? "green" : ticket.status === "In Progress" ? "blue" : "amber"}>{ticketStatusLabel(ticket)}</StatusBadge></td><td className="px-4 py-3.5 text-[11px] font-semibold text-slate-600">{ticket.completedDays === null ? "Not completed" : ticket.completedDays === 0 ? "Same day" : `${ticket.completedDays} days`}</td><td className="px-5 py-3.5 text-right"><Link href={ticketHref()} aria-label={`Open ${ticket.title}`} className={`inline-flex size-8 items-center justify-center rounded-lg ${solid} text-white transition ${brandIconHover}`}><ChevronRight size={15} /></Link></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center px-5 py-10 text-center">
              <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-400"><TicketCheck size={20} /></span>
              <p className="mt-3 text-sm font-bold text-slate-700">Belum ada isu tercatat</p>
              <p className="mt-1 max-w-sm text-xs text-slate-400">Data akan muncul di sini begitu ada permintaan atau laporan baru yang masuk.</p>
              <Link href={isRequester ? "/requests" : "/inbox"} className={`mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white transition ${brandCta}`}>{isRequester ? <Plus size={14} /> : <Inbox size={14} />}{isRequester ? "Buat permintaan pertama" : "Buka Inbox"}</Link>
            </div>
          )}
        </Card>

      </div>
    </>
  );
}

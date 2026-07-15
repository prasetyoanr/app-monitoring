import type { Metadata } from "next";
import { Activity, CheckCircle2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/session";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Login" };

function safeNextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") && value !== "/login"
    ? value
    : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-indigo-50 px-4 py-6 sm:grid sm:place-items-center sm:px-6">
      <section className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-2xl shadow-indigo-950/20 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-indigo-950 p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -right-24 top-16 size-72 rounded-full border border-white/15 bg-cyan-300/15 blur-sm" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-fuchsia-400/15" />
          <div className="flex items-center gap-3">
            <span className="brand-mark grid size-11 place-items-center rounded-2xl text-white">
              <Activity size={22} strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-bold">IT Activity Log</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/75">
                Internal Workspace
              </p>
            </div>
          </div>

          <div>
            <p className="max-w-sm text-3xl font-bold leading-tight tracking-tight">
              One workspace for every IT team activity.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-100/80">
              Manage troubleshooting, user backups, monitoring, and reports
              from one internal dashboard.
            </p>
            <div className="mt-8 space-y-3 text-xs text-blue-50/90">
              <p className="flex items-center gap-2.5"><CheckCircle2 size={16} />Data connected directly to PostgreSQL</p>
              <p className="flex items-center gap-2.5"><ShieldCheck size={16} />Secure sessions terminated on logout</p>
            </div>
          </div>

          <p className="text-[10px] text-blue-100/60">
            Restricted access for registered administrators and bosses.
          </p>
        </div>

        <div className="flex min-h-[calc(100vh-3rem)] flex-col justify-center p-6 sm:min-h-0 sm:p-10 lg:p-12">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="brand-mark grid size-10 place-items-center rounded-xl text-white">
              <Activity size={20} strokeWidth={2.5} />
            </span>
            <div><p className="text-sm font-bold text-slate-900">IT Activity Log</p><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Internal Workspace</p></div>
          </div>

          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <ShieldCheck size={13} /> Secure Access
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your account username and password.
            </p>
            <LoginForm nextPath={safeNextPath(next)} />
          </div>
        </div>
      </section>
    </main>
  );
}

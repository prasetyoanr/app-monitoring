import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Bell,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { getCurrentUser } from "@/auth/session";
import { LoginForm } from "@/components/login-form";
import { AuthInteractiveBackground } from "@/components/auth-interactive-background";

export const metadata: Metadata = { title: "Login" };

const features = [
  {
    icon: ClipboardList,
    title: "Service requests",
    text: "Submit and track requests to each division from a single portal.",
  },
  {
    icon: ShieldCheck,
    title: "Approval workflow",
    text: "Clear approval stages with notes, returns and an audit trail.",
  },
  {
    icon: Wrench,
    title: "Assignment & handling",
    text: "Requests are routed to the right agent and followed up to completion.",
  },
  {
    icon: Bell,
    title: "Realtime updates",
    text: "Get notified as soon as your request status changes.",
  },
];

const roles = ["Requester", "Receptionist", "Approver", "Service agent", "Administrator"];

function safeNextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") && value !== "/login"
    ? value
    : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const { next, registered } = await searchParams;

  return (
    <main className="auth-canvas grid min-h-[100dvh] place-items-center px-4 py-6 sm:px-6">
      <AuthInteractiveBackground />
      <div className="auth-surface mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-emerald-900/60 bg-[#111c16]/95 text-slate-100 shadow-2xl shadow-emerald-950/80 backdrop-blur-md lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden flex-col justify-between gap-10 border-r border-emerald-900/50 bg-gradient-to-br from-emerald-950/80 via-[#13241b] to-[#111c16] p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="" aria-hidden="true" priority width={44} height={44} className="size-11 rounded-full" />
              <div>
                <p className="text-sm font-bold text-white">General Affairs Management System</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
                  GA Services and Activities
                </p>
              </div>
            </div>

            <h2 className="mt-10 text-3xl font-bold leading-tight tracking-tight text-white">
              One place for every
              <span className="text-orange-400"> general affairs </span>
              request.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
              Submit requests, follow approvals and monitor GA activities, with every step
              recorded and visible.
            </p>

            <ul className="mt-8 space-y-4">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-400">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Access by role
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-emerald-900/60 bg-emerald-950/50 px-3 py-1 text-[11px] font-medium text-emerald-200/90"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="" aria-hidden="true" priority width={40} height={40} className="size-10 rounded-full" />
            <div>
              <p className="text-sm font-bold text-white">General Affairs Management System</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
                GA Services and Activities
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 w-full max-w-sm lg:mt-6">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Log in with your account to open your dashboard and requests.
            </p>
            {registered === "1" ? (
              <p
                role="status"
                className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/60 px-4 py-3 text-xs font-medium leading-5 text-emerald-300"
              >
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                Account created successfully. Please log in to continue.
              </p>
            ) : null}
            <LoginForm nextPath={safeNextPath(next)} />

            <div className="mt-6 rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Activity size={14} className="text-emerald-400" aria-hidden="true" />
                New requester?
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Create a requester account to submit service requests.{" "}
                <Link
                  href="/register"
                  className="font-semibold text-emerald-400 hover:text-orange-400"
                >
                  Register here
                </Link>
              </p>
            </div>
            <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">
              For security, an account is locked for 15 minutes after 5 failed attempts.
              Contact an administrator if you cannot sign in.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

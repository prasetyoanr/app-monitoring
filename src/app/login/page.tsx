import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/session";
import { LoginForm } from "@/components/login-form";
import { AuthInteractiveBackground } from "@/components/auth-interactive-background";

export const metadata: Metadata = { title: "OneService Login" };

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
      <section className="auth-surface mx-auto w-full max-w-lg rounded-[1.75rem] border border-emerald-900/60 bg-[#111c16]/95 p-6 text-slate-100 shadow-2xl shadow-emerald-950/80 backdrop-blur-md sm:p-10">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#16251e] p-1 ring-1 ring-emerald-900/60">
            <Image src="/oneservice-logo.png" alt="Logo OneService" width={44} height={44} className="h-full w-full object-contain" priority />
          </span>
          <div>
            <p className="text-sm font-bold text-white">OneService</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80">
              Portal Layanan Internal
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-md">
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Enter your account username and password.
          </p>
          {registered === "1" ? (
            <p className="mt-4 rounded-xl border border-emerald-900/50 bg-emerald-950/60 px-4 py-3 text-xs font-medium leading-5 text-emerald-300">
              Akun berhasil dibuat. Silakan login untuk melanjutkan.
            </p>
          ) : null}
          <LoginForm nextPath={safeNextPath(next)} />
          <p className="mt-5 text-center text-xs text-slate-400">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-semibold text-emerald-400 hover:text-orange-400">
              Register here
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

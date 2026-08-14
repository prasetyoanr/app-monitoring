import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/session";
import { LoginForm } from "@/components/login-form";

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
    <main className="min-h-screen bg-emerald-50 px-4 py-6 sm:grid sm:place-items-center sm:px-6">
      <section className="mx-auto w-full max-w-lg rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-2xl shadow-emerald-950/10 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white p-1 ring-1 ring-emerald-100">
            <Image src="/oneservice-logo.png" alt="Logo OneService" width={44} height={44} className="h-full w-full object-contain" priority />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">OneService</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Portal Layanan Internal
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
            <ShieldCheck size={13} /> Secure Access
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter your account username and password.
          </p>
          {registered === "1" ? (
            <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-medium leading-5 text-emerald-700">
              Akun berhasil dibuat. Silakan login untuk melanjutkan.
            </p>
          ) : null}
          <LoginForm nextPath={safeNextPath(next)} />
          <p className="mt-5 text-center text-xs text-slate-500">
            Belum memiliki akun?{" "}
            <Link href="/register" className="font-semibold text-emerald-700 hover:text-orange-600">
              Daftar sebagai Pemohon
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

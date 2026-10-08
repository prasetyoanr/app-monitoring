import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getCurrentUser } from "@/auth/session";
import { RegisterForm } from "@/components/register-form";
import { getMasterDataRecords } from "@/data/master-data";
import { AuthInteractiveBackground } from "@/components/auth-interactive-background";

export const metadata: Metadata = { title: "Requester Registration" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const masterData = await getMasterDataRecords();

  return <main className="auth-canvas min-h-screen px-4 py-6 sm:grid sm:place-items-center sm:px-6"><AuthInteractiveBackground /><section className="auth-surface mx-auto w-full max-w-lg rounded-[1.75rem] border border-emerald-900/60 bg-[#111c16]/95 p-6 text-slate-100 shadow-2xl shadow-emerald-950/80 backdrop-blur-md sm:p-10"><Link href="/login" className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-emerald-400 active:scale-95"><ArrowLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" /> Back to Login</Link><div className="mt-8 flex items-center gap-3"><Image src="/logo.png" alt="" aria-hidden="true" priority width={44} height={44} className="size-11 rounded-full" /><div><p className="text-sm font-bold text-white">General Affairs Management System</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80">GA Services and Activities</p></div></div><h1 className="mt-8 text-2xl font-bold tracking-tight text-white">Create Requester Account</h1><p className="mt-2 text-sm leading-6 text-slate-400">Enter a username, division, and password to create your requester account.</p><RegisterForm divisions={masterData.divisions} /></section></main>;
}

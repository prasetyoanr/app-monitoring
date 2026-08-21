import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/auth/session";
import { RegisterForm } from "@/components/register-form";
import { getMasterDataRecords } from "@/data/master-data";
import { AuthInteractiveBackground } from "@/components/auth-interactive-background";

export const metadata: Metadata = { title: "Daftar Akun Pemohon" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const masterData = await getMasterDataRecords();

  return <main className="auth-canvas min-h-screen px-4 py-6 sm:grid sm:place-items-center sm:px-6"><AuthInteractiveBackground /><section className="auth-surface mx-auto w-full max-w-lg rounded-[1.75rem] border border-emerald-900/60 bg-[#111c16]/95 p-6 text-slate-100 shadow-2xl shadow-emerald-950/80 backdrop-blur-md sm:p-10"><Link href="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400"><ArrowLeft size={15} /> Back to Login</Link><div className="mt-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#16251e] p-1 ring-1 ring-emerald-900/60"><Image src="/oneservice-logo.png" alt="Logo OneService" width={44} height={44} className="h-full w-full object-contain" priority /></span><div><p className="text-sm font-bold text-white">OneService</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80">Portal Layanan Internal</p></div></div><h1 className="mt-8 text-2xl font-bold tracking-tight text-white">Create Requester Account</h1><p className="mt-2 text-sm leading-6 text-slate-400">Enter a username, division, and password to create your requester account.</p><RegisterForm divisions={masterData.divisions} /></section></main>;
}

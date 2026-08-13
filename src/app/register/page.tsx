import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/auth/session";
import { RegisterForm } from "@/components/register-form";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "Daftar Akun Pemohon" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const masterData = await getMasterDataRecords();

  return <main className="min-h-screen bg-indigo-50 px-4 py-6 sm:grid sm:place-items-center sm:px-6"><section className="mx-auto w-full max-w-lg rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-2xl shadow-indigo-950/15 sm:p-10"><Link href="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Kembali ke Login</Link><div className="mt-8 flex items-center gap-3"><span className="brand-mark grid size-11 place-items-center rounded-2xl text-white"><Activity size={22} strokeWidth={2.5} /></span><div><p className="text-sm font-bold text-slate-900">IT Activity Log</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Internal Workspace</p></div></div><h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-950">Daftar akun Pemohon</h1><p className="mt-2 text-sm leading-6 text-slate-500">Isi username, divisi, dan password untuk membuat akun Pemohon.</p><RegisterForm divisions={masterData.divisions} /></section></main>;
}

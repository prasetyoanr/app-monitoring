import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/auth/session";
import { RegisterForm } from "@/components/register-form";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "Daftar Akun Pemohon" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const masterData = await getMasterDataRecords();

  return <main className="min-h-screen bg-emerald-50 px-4 py-6 sm:grid sm:place-items-center sm:px-6"><section className="mx-auto w-full max-w-lg rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-2xl shadow-emerald-950/10 sm:p-10"><Link href="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-600"><ArrowLeft size={15} /> Kembali ke Login</Link><div className="mt-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white p-1 ring-1 ring-emerald-100"><Image src="/oneservice-logo.png" alt="Logo OneService" width={44} height={44} className="h-full w-full object-contain" priority /></span><div><p className="text-sm font-bold text-slate-900">OneService</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Portal Layanan Internal</p></div></div><h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-950">Daftar akun Pemohon</h1><p className="mt-2 text-sm leading-6 text-slate-500">Isi username, divisi, dan password untuk membuat akun Pemohon.</p><RegisterForm divisions={masterData.divisions} /></section></main>;
}

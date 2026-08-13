"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useActionState, useState } from "react";

import { registerRequesterAction, type RegisterState } from "@/app/register/actions";

const initialState: RegisterState = { error: "" };

export function RegisterForm({ divisions }: { divisions: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(registerRequesterAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <label className="block"><span className="text-xs font-semibold text-slate-700">Username</span><span className="relative mt-2 block"><UserRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input name="username" required minLength={3} maxLength={80} autoComplete="username" autoCapitalize="none" spellCheck={false} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="nama.pengguna" /></span></label>
      <label className="block"><span className="text-xs font-semibold text-slate-700">Divisi</span><select name="divisionId" required defaultValue="" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"><option value="" disabled>Pilih divisi</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></label>
      <label className="block"><span className="text-xs font-semibold text-slate-700">Password</span><span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input name="password" type={showPassword ? "text" : "password"} required minLength={6} maxLength={128} autoComplete="new-password" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Minimal 6 karakter" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      {state.error ? <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium leading-5 text-rose-700">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{pending ? <LoaderCircle size={17} className="animate-spin" /> : null}{pending ? "Mendaftarkan..." : "Daftar sebagai Pemohon"}</button>
    </form>
  );
}

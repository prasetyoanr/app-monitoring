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
      <label className="block">
        <span className="text-xs font-semibold text-slate-300">Username</span>
        <span className="relative mt-2 block">
          <UserRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input name="username" required minLength={3} maxLength={80} autoComplete="username" autoCapitalize="none" spellCheck={false} className="h-12 w-full rounded-xl border border-emerald-900/50 bg-[#16251e]/80 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:bg-[#16251e] focus:ring-4 focus:ring-emerald-500/20" placeholder="Username" />
        </span>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-slate-300">Division</span>
        <select name="divisionId" required defaultValue="" className="mt-2 h-12 w-full rounded-xl border border-emerald-900/50 bg-[#16251e]/80 px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:bg-[#16251e] focus:ring-4 focus:ring-emerald-500/20">
          <option value="" disabled className="bg-[#111c16] text-slate-400">Your division</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id} className="bg-[#111c16] text-slate-100">
              {division.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-slate-300">Password</span>
        <span className="relative mt-2 block">
          <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input name="password" type={showPassword ? "text" : "password"} required minLength={6} maxLength={128} autoComplete="new-password" className="h-12 w-full rounded-xl border border-emerald-900/50 bg-[#16251e]/80 pl-11 pr-12 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:bg-[#16251e] focus:ring-4 focus:ring-emerald-500/20" placeholder="At least 6 characters" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-emerald-950 hover:text-slate-200" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>
      {state.error ? <p role="alert" className="rounded-xl border border-rose-900/50 bg-rose-950/60 px-4 py-3 text-xs font-medium leading-5 text-rose-300">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-emerald-950/60 disabled:text-slate-500 disabled:shadow-none">
        {pending ? <LoaderCircle size={17} className="animate-spin" /> : null}
        {pending ? "Registering..." : "Register Account"}
      </button>
    </form>
  );
}

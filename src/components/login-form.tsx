"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useActionState, useState } from "react";

import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: "" };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block">
        <span className="text-xs font-semibold text-slate-300">Username</span>
        <span className="relative mt-2 block">
          <UserRound
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            name="username"
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-emerald-900/50 bg-[#16251e]/80 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:bg-[#16251e] focus:ring-4 focus:ring-emerald-500/20"
            placeholder="Enter username"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-300">Password</span>
        <span className="relative mt-2 block">
          <LockKeyhole
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            maxLength={128}
            autoComplete="current-password"
            onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
            onBlur={() => setCapsLock(false)}
            className="h-12 w-full rounded-xl border border-emerald-900/50 bg-[#16251e]/80 pl-11 pr-12 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:bg-[#16251e] focus:ring-4 focus:ring-emerald-500/20"
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="auth-icon-button absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-emerald-950 hover:text-slate-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            <span key={String(showPassword)} className="auth-icon-swap">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </span>
          </button>
        </span>
        {capsLock ? (
          <span className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
            <TriangleAlert size={13} aria-hidden="true" /> Caps Lock is on
          </span>
        ) : null}
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-900/50 bg-rose-950/60 px-4 py-3 text-xs font-medium leading-5 text-rose-300"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="auth-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
      >
        {pending ? <LoaderCircle size={17} className="animate-spin" /> : null}
        {pending ? "Checking..." : "Login"}
        {pending ? null : <ArrowRight size={17} className="auth-button-arrow" aria-hidden="true" />}
      </button>
    </form>
  );
}

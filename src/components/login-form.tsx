"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useActionState, useState } from "react";

import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: "" };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Username</span>
        <span className="relative mt-2 block">
          <UserRound
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={80}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="Enter username"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Password</span>
        <span className="relative mt-2 block">
          <LockKeyhole
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            maxLength={128}
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium leading-5 text-rose-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-[#2445b5] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {pending ? <LoaderCircle size={17} className="animate-spin" /> : null}
        {pending ? "Checking..." : "Login"}
      </button>
    </form>
  );
}

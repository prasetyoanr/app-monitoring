"use client";

import { useState, useTransition } from "react";
import { createGaActivityAction } from "@/app/activities/actions";

export function GaActivityForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      setMessage("");
      try {
        const result = await createGaActivityAction(data);
        setMessage(result.ok ? "Activity recorded successfully." : result.error);
        if (result.ok) form.reset();
      } catch { setMessage("Unable to contact the server. Please try again."); }
    });
  }}>
    <h2 className="text-sm font-bold sm:col-span-2">Record Internal Activity</h2>
    <label className="text-xs font-semibold">Activity<input name="title" required maxLength={200} disabled={pending} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
    <label className="text-xs font-semibold">Location<input name="location" required maxLength={160} disabled={pending} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3" /></label>
    <label className="text-xs font-semibold sm:col-span-2">Work Notes<textarea name="description" required maxLength={10000} rows={3} disabled={pending} className="mt-1 w-full rounded-lg border border-slate-200 p-3" /></label>
    <label className="text-xs font-semibold">Status<select name="status" disabled={pending} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"><option value="In Progress">In Progress</option><option value="Completed">Completed</option></select></label>
    <button disabled={pending} className="h-10 self-end rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save Activity"}</button>
    {message ? <p role="status" className="text-xs sm:col-span-2">{message}</p> : null}
  </form>;
}

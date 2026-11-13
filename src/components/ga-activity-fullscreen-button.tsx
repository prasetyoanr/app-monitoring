"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function fullscreenSnapshot() {
  return document.fullscreenElement?.matches("main.app-main") ?? false;
}

export function GaActivityFullscreenButton({ hero = false }: { hero?: boolean }) {
  const fullscreen = useSyncExternalStore(subscribeFullscreen, fullscreenSnapshot, () => false);
  const [error, setError] = useState("");

  async function toggle() {
    const page = document.querySelector<HTMLElement>("main.app-main");
    if (!page) return;
    setError("");
    try {
      if (document.fullscreenElement === page) await document.exitFullscreen();
      else await page.requestFullscreen();
    } catch {
      setError("Fullscreen is unavailable in this browser.");
    }
  }

  return (
    <div className="shrink-0">
      <button type="button" onClick={() => void toggle()} aria-pressed={fullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} title={error || (fullscreen ? "Exit fullscreen" : "Fullscreen")} className={hero
        ? "grid size-9 place-items-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        : "grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"}>
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      {error ? <span role="alert" className="sr-only">{error}</span> : null}
    </div>
  );
}

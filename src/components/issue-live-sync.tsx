"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { createRefreshQueue } from "@/lib/refresh-queue";

export function IssueLiveSync() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const queueRef = useRef<ReturnType<typeof createRefreshQueue> | null>(null);

  useEffect(() => {
    if (!pending) queueRef.current?.complete();
  }, [pending]);

  useEffect(() => {
    const queue = createRefreshQueue(() => startTransition(() => router.refresh()), () => document.visibilityState === "visible");
    queueRef.current = queue;
    let source: EventSource | null = null;
    let fallback: ReturnType<typeof setInterval> | undefined;
    const stopFallback = () => { clearInterval(fallback); fallback = undefined; };
    const startFallback = () => {
      // Only used while streaming is unavailable, never alongside a healthy SSE.
      fallback ??= setInterval(() => queue.request(), 30_000 + Math.floor(Math.random() * 5_000));
    };
    const disconnect = () => { source?.close(); source = null; stopFallback(); };
    const connect = () => {
      if (source || document.visibilityState !== "visible") return;
      if (typeof EventSource === "undefined") { startFallback(); return; }
      source = new EventSource("/api/issue-events");
      source.addEventListener("ready", () => { stopFallback(); queue.request(); });
      source.addEventListener("changed", () => queue.request());
      source.onerror = () => startFallback();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") { queue.request(); connect(); }
      else disconnect();
    };
    const onOnline = () => { disconnect(); queue.request(); connect(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    connect();
    return () => {
      disconnect();
      queue.dispose();
      queueRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [router]);

  return null;
}

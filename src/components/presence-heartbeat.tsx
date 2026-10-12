"use client";

import { useEffect } from "react";

import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence";

// Tells the server this account has a visible tab open, so User Management can show who is
// online. Nothing is sent while the tab is hidden, and it stops once the session has ended.
export function PresenceHeartbeat() {
  useEffect(() => {
    let stopped = false;

    async function beat() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/heartbeat", { method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true });
        // 401 (session over) or a redirect to the login page: stop quietly.
        if (response.status === 401 || response.redirected) stopped = true;
      } catch {
        // Offline or a short network problem; the next beat tries again.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void beat();
    }

    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}

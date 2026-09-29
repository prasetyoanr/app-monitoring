import { canReceiveIssueChange } from "./issue-events";
import type { IssueEventHub } from "./issue-event-hub";

export function createIssueEventStream(
  signal: AbortSignal,
  user: Parameters<typeof canReceiveIssueChange>[0],
  hub: Pick<IssueEventHub, "subscribe">,
  lifetime = 120_000 + Math.floor(Math.random() * 30_000),
) {
  let stop = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let unsubscribe = () => {};
      const timers: { heartbeat?: ReturnType<typeof setInterval>; expiry?: ReturnType<typeof setTimeout> } = {};
      stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(timers.heartbeat);
        clearTimeout(timers.expiry);
        unsubscribe();
        signal.removeEventListener("abort", stop);
        try { controller.close(); } catch { /* The reader may already have cancelled. */ }
      };
      const send = (message: string) => {
        if (closed) return;
        // Bound queued chunks if the client stops reading.
        if ((controller.desiredSize ?? 0) <= 0) { stop(); return; }
        controller.enqueue(encoder.encode(message));
      };
      signal.addEventListener("abort", stop, { once: true });
      if (signal.aborted) { stop(); return; }
      send(`retry: ${3_000 + Math.floor(Math.random() * 2_000)}\n\n`);
      unsubscribe = hub.subscribe((event) => {
        if (event.type === "unavailable") stop();
        else if (event.type === "ready") send("event: ready\ndata: {}\n\n");
        else if (canReceiveIssueChange(user, event.audience)) send("event: changed\ndata: {}\n\n");
      });
      // Also clean up if a subscription failed synchronously.
      if (closed) { unsubscribe(); return; }
      timers.heartbeat = setInterval(() => send(": heartbeat\n\n"), 20_000);
      timers.expiry = setTimeout(stop, lifetime);
    },
    cancel() { stop(); },
  }, { highWaterMark: 32 });
}

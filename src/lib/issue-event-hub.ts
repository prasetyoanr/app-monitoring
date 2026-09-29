import type { Client } from "pg";
import { ISSUE_EVENT_CHANNEL, issueAudienceSchema, type IssueAudience } from "./issue-events";

type HubEvent = { type: "ready" } | { type: "change"; audience: IssueAudience } | { type: "unavailable" };
type Subscriber = (event: HubEvent) => void;

// One dedicated LISTEN connection per server process, not per browser.
export class IssueEventHub {
  private client: Client | null = null;
  private ready = false;
  private subscribers = new Set<Subscriber>();
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly createClient: () => Client, private readonly channel = ISSUE_EVENT_CHANNEL) {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(channel)) throw new Error("Invalid notification channel.");
  }

  subscribe(subscriber: Subscriber): () => void {
    clearTimeout(this.idleTimer);
    this.subscribers.add(subscriber);
    if (this.ready) queueMicrotask(() => {
      if (this.subscribers.has(subscriber)) subscriber({ type: "ready" });
    });
    else if (!this.client) void this.connect();

    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0) {
        this.idleTimer = setTimeout(() => this.disconnect(), 5_000);
        this.idleTimer.unref?.();
      }
    };
  }

  private emit(event: HubEvent) {
    for (const subscriber of [...this.subscribers]) subscriber(event);
  }

  private async connect() {
    const client = this.createClient();
    this.client = client;
    const fail = () => {
      if (this.client !== client) return;
      this.disconnect();
      this.emit({ type: "unavailable" });
    };
    client.on("error", fail);
    client.on("end", fail);
    client.on("notification", (message) => {
      if (this.client !== client || message.channel !== this.channel || !message.payload) return;
      try {
        const parsed = issueAudienceSchema.safeParse(JSON.parse(message.payload));
        if (parsed.success) this.emit({ type: "change", audience: parsed.data });
      } catch { /* Ignore malformed signals; never send their payload to a browser. */ }
    });
    try {
      await client.connect();
      await client.query(`LISTEN ${this.channel}`);
      if (this.client !== client) return;
      this.ready = true;
      this.emit({ type: "ready" });
    } catch {
      // Each SSE client reconnects with backoff. A dropped listener must not
      // crash Next.js or hold any of the application's query pool connections.
      fail();
    }
  }

  private disconnect() {
    clearTimeout(this.idleTimer);
    const client = this.client;
    this.client = null;
    this.ready = false;
    if (client) void client.end().catch(() => {});
  }
}

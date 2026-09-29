import "server-only";
import { Client } from "pg";
import { IssueEventHub } from "./issue-event-hub";

const runtime = globalThis as typeof globalThis & { issueEventHub?: IssueEventHub };

export function getIssueEventHub(): IssueEventHub {
  // Keep the transport singleton across development hot reloads. Authentication
  // and audience checks remain local to each SSE request, never global state.
  return runtime.issueEventHub ??= new IssueEventHub(() => new Client({
    connectionString: process.env.DATABASE_LISTEN_URL ?? process.env.DATABASE_URL,
    application_name: "ga_management_realtime",
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  }));
}

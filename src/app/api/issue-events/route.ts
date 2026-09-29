import { getCurrentUser } from "@/auth/session";
import { createIssueEventStream } from "@/lib/issue-event-stream";
import { getIssueEventHub } from "@/lib/issue-event-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  // HTTP 204 tells EventSource not to reconnect after session expiry.
  if (!user) return new Response(null, { status: 204 });

  // Renew the connection periodically to recheck login, account and division.
  const stream = createIssueEventStream(request.signal, user, getIssueEventHub());
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "private, no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

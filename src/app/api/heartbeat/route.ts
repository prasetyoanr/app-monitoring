import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/auth/constants";
import { recordHeartbeat } from "@/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called every ~30 seconds by each visible tab (PresenceHeartbeat). One indexed UPDATE, no
// joins and no audit entry, so it stays cheap with many users.
export async function POST() {
  const cookieStore = await cookies();
  try {
    const state = await recordHeartbeat(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    return new Response(null, {
      status: state === "ok" ? 204 : 401,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to record heartbeat.", error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

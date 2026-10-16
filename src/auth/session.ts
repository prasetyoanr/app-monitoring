import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE_NAME } from "@/auth/constants";
import { db } from "@/db";
import { authSessions, masterDivisions, technicians } from "@/db/schema";
import type { AccountRole, ServiceLane } from "@/data/types";
import { HEARTBEAT_WRITE_INTERVAL_MS, SESSION_TOUCH_INTERVAL_MS } from "@/lib/presence";
import { recordAuthorizationDenied } from "@/security/audit";

const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  role: AccountRole;
  serviceLane: ServiceLane | null;
  divisionId: string | null;
  divisionName: string | null;
  divisionSlug?: string | null;
  isGaUnit?: boolean;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isITDivisionName(divisionName: string | null | undefined): boolean {
  if (!divisionName) return false;
  const div = divisionName.trim().toLowerCase();
  return div === "it team" || div === "it" || div.includes("information technology") || div.startsWith("it");
}

export function isITTeamUser(user: AuthenticatedUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "administrator") return true;
  return isITDivisionName(user.divisionName);
}

export function isITRoleUser(user: AuthenticatedUser | null | undefined): boolean {
  return Boolean(
    user &&
      user.role !== "administrator" &&
      ["service_agent", "approver"].includes(user.role) &&
      isITTeamUser(user),
  );
}

// Session tokens are 32 random bytes in base64url; only their hash is stored.
export function isSessionToken(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{43}$/.test(value));
}

// Creates the session row and returns the raw token. The web login puts it in a cookie,
// the API login hands it to the client as a bearer token.
// Expired sessions are only useful for a short while ("last seen"), then they are removed so
// the table does not grow forever. Runs on sign-in, at most once an hour per server process.
const EXPIRED_SESSION_RETENTION_MS = 7 * 86_400_000;
let lastSessionPurgeAt = 0;

async function purgeExpiredSessions() {
  const now = Date.now();
  if (now - lastSessionPurgeAt < 3_600_000) return;
  lastSessionPurgeAt = now;
  try {
    await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date(now - EXPIRED_SESSION_RETENTION_MS)));
  } catch (error) {
    console.error("Unable to remove expired sessions.", error);
  }
}

export async function issueSessionToken(technicianId: string) {
  void purgeExpiredSessions();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(authSessions).values({
    tokenHash: tokenHash(token),
    technicianId,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function createSession(technicianId: string) {
  const { token, expiresAt } = await issueSessionToken(technicianId);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Marks the session as used, at most once per SESSION_TOUCH_INTERVAL_MS. The "older than"
// condition is part of the UPDATE, so most calls change nothing and cost one indexed lookup.
async function touchSession(token: string) {
  try {
    await db
      .update(authSessions)
      .set({ lastUsedAt: new Date() })
      .where(and(
        eq(authSessions.tokenHash, tokenHash(token)),
        lt(authSessions.lastUsedAt, new Date(Date.now() - SESSION_TOUCH_INTERVAL_MS)),
      ));
  } catch (error) {
    // Presence is informational; never fail a request because of it.
    console.error("Unable to record session activity.", error);
  }
}

// Called by the heartbeat endpoint. Records activity (at most once per
// HEARTBEAT_WRITE_INTERVAL_MS) and reports whether the session is still valid. It does not
// extend the session: the sign-in expiry stays exactly as it was.
export async function recordHeartbeat(token: string | null | undefined): Promise<"ok" | "expired"> {
  if (!isSessionToken(token)) return "expired";
  const hash = tokenHash(token);
  const now = new Date();
  const written = await db
    .update(authSessions)
    .set({ lastUsedAt: now })
    .where(and(
      eq(authSessions.tokenHash, hash),
      gt(authSessions.expiresAt, now),
      lt(authSessions.lastUsedAt, new Date(now.getTime() - HEARTBEAT_WRITE_INTERVAL_MS)),
    ))
    .returning({ tokenHash: authSessions.tokenHash });
  if (written.length) return "ok";
  // Nothing written: either another tab just reported, or the session has ended.
  const [valid] = await db
    .select({ tokenHash: authSessions.tokenHash })
    .from(authSessions)
    .where(and(eq(authSessions.tokenHash, hash), gt(authSessions.expiresAt, now)))
    .limit(1);
  return valid ? "ok" : "expired";
}

export async function findUserBySessionToken(
  token: string | null | undefined,
): Promise<AuthenticatedUser | null> {
  if (!isSessionToken(token)) return null;

  const [row] = await db
      .select({
        id: technicians.id,
        name: technicians.name,
        username: technicians.username,
        role: technicians.role,
        serviceLane: technicians.serviceLane,
        divisionId: technicians.divisionId,
        divisionName: masterDivisions.name,
        divisionSlug: masterDivisions.slug,
        isGaUnit: masterDivisions.isGaUnit,
      })
      .from(authSessions)
      .innerJoin(
        technicians,
        eq(authSessions.technicianId, technicians.id),
      )
      .leftJoin(
        masterDivisions,
        eq(technicians.divisionId, masterDivisions.id),
      )
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash(token)),
          gt(authSessions.expiresAt, new Date()),
          eq(technicians.isActive, true),
        ),
      )
      .limit(1);

    if (!row?.username) return null;
    void touchSession(token);
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      role: row.role,
      serviceLane: row.serviceLane,
      divisionId: row.divisionId,
      divisionName: row.divisionName,
      divisionSlug: row.divisionSlug,
      isGaUnit: row.isGaUnit ?? false,
    };
}

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const cookieStore = await cookies();
    return findUserBySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  },
);

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdministrator(capability?: string) {
  const user = await requireAuthenticatedUser();
  if (user.role !== "administrator") {
    if (capability) await recordAuthorizationDenied(user, capability);
    redirect("/");
  }
  return user;
}

export async function requireITTeam(capability?: string) {
  const user = await requireAuthenticatedUser();
  if (!isITTeamUser(user) || !["administrator", "service_agent", "approver"].includes(user.role)) {
    if (capability) await recordAuthorizationDenied(user, capability);
    redirect("/");
  }
  return user;
}

export async function requireITRoleUser(capability?: string) {
  const user = await requireAuthenticatedUser();
  if (!isITRoleUser(user)) {
    if (capability) await recordAuthorizationDenied(user, capability);
    redirect("/");
  }
  return user;
}

export async function requireServiceAgent(capability?: string) {
  const user = await requireAuthenticatedUser();
  if (user.role !== "administrator" && user.role !== "service_agent") {
    if (capability) await recordAuthorizationDenied(user, capability);
    redirect("/");
  }
  return user;
}

// Staff do assigned work, and so do Admin (Receptionist) accounts; each action still checks
// that the request is assigned to the caller.
export async function requireIssueWorker(capability?: string) {
  const user = await requireAuthenticatedUser();
  if (user.role !== "administrator" && user.role !== "service_agent" && user.role !== "receptionist") {
    if (capability) await recordAuthorizationDenied(user, capability);
    redirect("/");
  }
  return user;
}

export async function deleteSessionByToken(token: string | null | undefined) {
  if (!isSessionToken(token)) return;
  await db
    .delete(authSessions)
    .where(eq(authSessions.tokenHash, tokenHash(token)));
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  await deleteSessionByToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  cookieStore.delete(SESSION_COOKIE_NAME);
}

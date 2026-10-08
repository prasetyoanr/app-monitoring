import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE_NAME } from "@/auth/constants";
import { db } from "@/db";
import { authSessions, masterDivisions, technicians } from "@/db/schema";
import type { AccountRole } from "@/data/types";
import { recordAuthorizationDenied } from "@/security/audit";

const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  role: AccountRole;
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
export async function issueSessionToken(technicianId: string) {
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
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      role: row.role,
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

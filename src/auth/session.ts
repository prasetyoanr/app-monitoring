import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE_NAME } from "@/auth/constants";
import { db } from "@/db";
import { authSessions, masterDivisions, technicians } from "@/db/schema";

const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  role: "administrator" | "boss" | "technician" | "requester";
  divisionId: string | null;
  divisionName: string | null;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isITTeamUser(user: AuthenticatedUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "administrator") return true;
  if (!user.divisionName) return false;
  const div = user.divisionName.trim().toLowerCase();
  return div === "it team" || div === "it" || div.includes("information technology") || div.startsWith("it");
}

export async function createSession(technicianId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(authSessions).values({
    tokenHash: tokenHash(token),
    technicianId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

    const [row] = await db
      .select({
        id: technicians.id,
        name: technicians.name,
        username: technicians.username,
        role: technicians.role,
        divisionId: technicians.divisionId,
        divisionName: masterDivisions.name,
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
    };
  },
);

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdministrator() {
  const user = await requireAuthenticatedUser();
  if (user.role !== "administrator") redirect("/");
  return user;
}

export async function requireITTeam() {
  const user = await requireAuthenticatedUser();
  if (!isITTeamUser(user)) redirect("/");
  return user;
}

export async function requireServiceAgent() {
  const user = await requireAuthenticatedUser();
  if (user.role === "requester") redirect("/");
  return user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    await db
      .delete(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash(token)));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

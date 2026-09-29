"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { verifyPassword } from "@/auth/password";
import {
  createSession,
  deleteCurrentSession,
  getCurrentUser,
} from "@/auth/session";
import { db } from "@/db";
import { auditLogs, technicians } from "@/db/schema";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface LoginState {
  error: string;
}

function safeRedirectPath(value: FormDataEntryValue | null) {
  const path = String(value ?? "");
  return path.startsWith("/") && !path.startsWith("//") && path !== "/login"
    ? path
    : "/";
}

async function recordFailedLogin(input: {
  username: string;
  accountId?: string;
  reason: "invalid_format" | "invalid_credentials" | "inactive" | "locked";
}) {
  try {
    await db.insert(auditLogs).values({
      actorType: "system",
      actorId: input.accountId ?? null,
      action: "authentication.login_failed",
      entityType: "authentication",
      entityId: ((input.accountId ?? input.username) || "unknown-user").slice(0, 120),
      metadata: {
        username: input.username.slice(0, 80),
        reason: input.reason,
      },
    });
  } catch (error) {
    console.error("Unable to record failed login.", error);
  }
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"));

  if (!/^[a-z0-9._-]{3,80}$/.test(username) || password.length > 128) {
    await recordFailedLogin({ username, reason: "invalid_format" });
    return { error: "The username or password format is invalid." };
  }

  const [account] = await db
    .select({
      id: technicians.id,
      passwordHash: technicians.passwordHash,
      isActive: technicians.isActive,
      failedLoginAttempts: technicians.failedLoginAttempts,
      lockedUntil: technicians.lockedUntil,
    })
    .from(technicians)
    .where(eq(technicians.username, username))
    .limit(1);
  const passwordMatches = await verifyPassword(password, account?.passwordHash);
  const now = new Date();
  const locked = Boolean(account?.lockedUntil && account.lockedUntil > now);

  if (!account || !account.isActive || locked || !passwordMatches) {
    if (account?.isActive && !locked) {
      const attempts = account.failedLoginAttempts + 1;
      await db
        .update(technicians)
        .set({
          failedLoginAttempts: attempts >= MAX_FAILED_ATTEMPTS ? 0 : attempts,
          lockedUntil:
            attempts >= MAX_FAILED_ATTEMPTS
              ? new Date(now.getTime() + LOCK_DURATION_MS)
              : null,
          updatedAt: now,
        })
        .where(eq(technicians.id, account.id));
    }
    await recordFailedLogin({
      username,
      accountId: account?.id,
      reason: !account || !passwordMatches
        ? "invalid_credentials"
        : !account.isActive
          ? "inactive"
          : "locked",
    });
    return {
      error: "Login failed. Check your username and password or try again later.",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(technicians)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: now })
      .where(eq(technicians.id, account.id));
    await tx.insert(auditLogs).values({
      actorType: "technician",
      actorId: account.id,
      action: "authentication.login",
      entityType: "technician",
      entityId: account.id,
    });
  });
  await createSession(account.id);
  redirect(nextPath);
}

export async function logoutAction() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: "authentication.logout",
      entityType: "technician",
      entityId: currentUser.id,
    });
  }
  await deleteCurrentSession();
  redirect("/login");
}

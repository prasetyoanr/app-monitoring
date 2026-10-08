// Colour coding for the actions shown in the audit log. The action name looks like
// "<module>.<verb>" (for example "account.created" or "authentication.login_failed"), so the
// kind of action is read from its wording. Class names are written out in full so Tailwind
// can detect them.

export type AuditActionTone = "alert" | "delete" | "sensitive" | "approval" | "create" | "update" | "session";

interface AuditActionStyle {
  tone: AuditActionTone;
  label: string;
  /** Pill used for the action itself. */
  badge: string;
  /** Small dot inside the pill and in the legend. */
  dot: string;
}

const styles: Record<AuditActionTone, Omit<AuditActionStyle, "tone">> = {
  alert: { label: "Failed / denied", badge: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  delete: { label: "Delete / revoke", badge: "bg-orange-50 text-orange-700 ring-orange-600/20", dot: "bg-orange-500" },
  sensitive: { label: "Sensitive / reset", badge: "bg-amber-50 text-amber-800 ring-amber-600/25", dot: "bg-amber-500" },
  approval: { label: "Approval / export", badge: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  create: { label: "Create / sign in", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  update: { label: "Update", badge: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  session: { label: "Sign out / other", badge: "bg-slate-100 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
};

export const auditActionLegend: Array<{ tone: AuditActionTone; label: string; dot: string }> = (
  ["create", "update", "approval", "sensitive", "delete", "alert", "session"] as AuditActionTone[]
).map((tone) => ({ tone, label: styles[tone].label, dot: styles[tone].dot }));

// Order matters: a failed sign-in must be an alert before it is read as a sign-in.
export function auditActionTone(action: string): AuditActionTone {
  const name = action.toLowerCase();
  if (/failed|denied|rejected|blocked/.test(name)) return "alert";
  if (/deleted|removed|revoked|expired/.test(name)) return "delete";
  if (/sensitive|accessed|password_reset|unlock|locked/.test(name)) return "sensitive";
  if (/requested|exported|\.export/.test(name)) return "approval";
  if (/created|published|approved|completed|submitted|\.login$|added|queued/.test(name)) return "create";
  if (/updated|changed|settings|duplicated|assigned|opened|reopened|saved/.test(name)) return "update";
  return "session";
}

export function auditActionStyle(action: string): AuditActionStyle {
  const tone = auditActionTone(action);
  return { tone, ...styles[tone] };
}

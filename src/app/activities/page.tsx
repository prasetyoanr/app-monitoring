import Link from "next/link";
import { and, desc, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { masterDivisions, technicians, troubleshootingIssues as issues } from "@/db/schema";
import { GaActivityForm } from "@/components/ga-activity-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "GA Activities" };

export default async function ActivitiesPage() {
  const user = await requireAuthenticatedUser();
  const supervisor = ["administrator", "receptionist", "approver"].includes(user.role);
  if (!supervisor && user.role !== "service_agent") redirect("/");
  const [unit] = user.divisionId ? await db.select().from(masterDivisions).where(eq(masterDivisions.id, user.divisionId)).limit(1) : [];
  if (!supervisor && !unit?.isGaUnit) redirect("/");
  const records = await db.select({ id: issues.id, title: issues.title, status: issues.status, description: issues.description, unit: masterDivisions.name, member: technicians.name, date: issues.reportedAt, source: issues.source })
    .from(issues).innerJoin(masterDivisions, eq(issues.serviceDivisionId, masterDivisions.id))
    .leftJoin(technicians, eq(issues.assignedTechnicianId, technicians.id))
    .where(and(eq(masterDivisions.isGaUnit, true), or(eq(issues.source, "manual"), eq(issues.workflowStatus, "assigned")), supervisor ? undefined : eq(issues.assignedTechnicianId, user.id)))
    .orderBy(desc(issues.reportedAt)).limit(100);
  const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium" });
  return <>
    <PageHeader eyebrow="General Affairs" title="GA Member Activities" description="The 100 most recent activities and assignments. IT activities continue to be recorded through the IT Inbox." />
    {user.role === "service_agent" && !isITTeamUser(user) && unit?.inboxProfileKey === "basic-service" ? <GaActivityForm /> : null}
    <p className="mb-4 text-xs text-slate-500">Update work status through the <Link href="/inbox" className="font-semibold text-indigo-600">Inbox</Link>.</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {records.map((record) => <article key={record.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] text-slate-500">{dateFormat.format(record.date)} · {record.source === "manual" ? "Internal activity" : "Division request"}</p>
        <h2 className="mt-2 break-words text-sm font-bold">{record.title}</h2>
        <p className="mt-1 text-xs text-slate-600">{record.unit} · {record.member ?? "Not assigned"}</p>
        <span className="mt-3 inline-block rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">{record.status}</span>
        <details className="mt-3 text-xs"><summary className="cursor-pointer text-indigo-600">Work notes</summary><p className="mt-2 whitespace-pre-wrap break-words text-slate-600">{record.description}</p></details>
      </article>)}
    </div>
    {!records.length ? <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">No activities yet.</p> : null}
  </>;
}

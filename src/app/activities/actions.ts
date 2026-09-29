"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, masterDivisions, troubleshootingIssues } from "@/db/schema";
import type { ActionResult } from "@/data/types";
import { generateRecordId } from "@/lib/record-id";
import { issueChangeQuery } from "@/lib/issue-event-query";

export async function createGaActivityAction(form: FormData): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try {
    if (user.role !== "service_agent" || !user.divisionId || isITTeamUser(user)) throw new Error("IT activities are recorded through the Inbox. This form is only for members of other GA units.");
    const [unit] = await db.select().from(masterDivisions).where(and(eq(masterDivisions.id, user.divisionId), eq(masterDivisions.isGaUnit, true))).limit(1);
    if (!unit || unit.inboxProfileKey !== "basic-service") throw new Error("This GA unit is not enabled for general activity recording.");
    const read = (key: string, max: number) => {
      const value = String(form.get(key) ?? "").trim();
      if (!value || value.length > max) throw new Error(`${key} is required and must not exceed ${max} characters.`);
      return value;
    };
    const title = read("title", 200);
    const description = read("description", 10000);
    const location = read("location", 160);
    const status = read("status", 40);
    if (status !== "In Progress" && status !== "Completed") throw new Error("The activity status is invalid.");
    const id = generateRecordId("TR");
    await db.transaction(async (tx) => {
      await tx.insert(troubleshootingIssues).values({
        id, title, description, location, category: "GA Internal Activity", priority: "Medium",
        requesterName: user.name, division: unit.name, serviceDivision: unit.name, serviceDivisionId: unit.id,
        source: "manual", requestFormKey: "generic-request", reportedAt: new Date(), status,
        completedDays: status === "Completed" ? 0 : null,
        workflowEnabled: false, workflowStatus: "assigned", approvalRequired: false, assignedTechnicianId: user.id,
      });
      await tx.insert(auditLogs).values({ actorType: "technician", actorId: user.id, action: "ga.activity.created", entityType: "troubleshooting_issue", entityId: id });
      await tx.execute(issueChangeQuery(id));
    });
    revalidatePath("/activities"); revalidatePath("/inbox"); revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to record GA activity", error);
    return { ok: false, error: error instanceof Error ? error.message : "The activity could not be saved." };
  }
}

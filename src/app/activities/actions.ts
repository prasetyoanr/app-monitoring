"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isITDivisionName, isITTeamUser, requireAuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { auditLogs, gaWorkPlanItems, masterDivisions, technicians, troubleshootingIssues } from "@/db/schema";
import { getCurrentGaWorkPlanMember } from "@/data/ga-workspace";
import type { ActionResult } from "@/data/types";
import { gaWorkPlanStatuses, reportingPeriodStartForDate, shiftDate, workPlanInputError, type GaWorkPlanStatus } from "@/lib/ga-work-plan";
import { jakartaDateInput } from "@/lib/jakarta-date";
import { generateRecordId } from "@/lib/record-id";
import { issueChangeQuery } from "@/lib/issue-event-query";
import { validateGaSpreadsheetInput } from "@/lib/ga-spreadsheet";
import { recordAuthorizationDenied } from "@/security/audit";

export async function createGaActivityAction(form: FormData): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try {
    if (user.role !== "service_agent" || !user.divisionId || isITTeamUser(user)) throw new Error("IT activities are recorded through the Inbox. This form is only for staff of other GA units.");
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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createGaWorkPlanAction(form: FormData): Promise<ActionResult> {
  try {
    const member = await getCurrentGaWorkPlanMember();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const weekStart = String(form.get("weekStart") ?? "").trim();
    const targetMode = String(form.get("targetMode") ?? "").trim();
    const targetDate = targetMode === "date" ? String(form.get("targetDate") ?? "").trim() : "";
    const validationError = workPlanInputError({ title, description, weekStart, targetMode, targetDate });
    if (validationError) throw new Error(validationError);

    const currentPeriod = reportingPeriodStartForDate(jakartaDateInput());
    if (weekStart < shiftDate(currentPeriod, -56) || weekStart > shiftDate(currentPeriod, 84)) {
      throw new Error("Work plans can only be created from 8 weeks ago through 12 weeks ahead.");
    }

    await db.transaction(async (tx) => {
      const rows = await tx.insert(gaWorkPlanItems).values({
        memberId: member.id,
        divisionId: member.divisionId,
        weekStart,
        targetMode: targetMode as "date" | "until_completed",
        targetDate: targetDate || null,
        title,
        description,
      }).returning({ id: gaWorkPlanItems.id });
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: member.id,
        action: "ga.work_plan.created",
        entityType: "ga_work_plan_item",
        entityId: rows[0].id,
        metadata: { weekStart, targetMode, targetDate: targetDate || null },
      });
      return rows;
    });
    revalidatePath("/activities");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to create GA work plan item", error);
    return { ok: false, error: error instanceof Error ? error.message : "The work plan could not be saved." };
  }
}

export async function updateGaWorkPlanStatusAction(input: {
  id: string;
  status: GaWorkPlanStatus;
}): Promise<ActionResult> {
  try {
    const member = await getCurrentGaWorkPlanMember();
    if (!uuidPattern.test(input.id) || !gaWorkPlanStatuses.includes(input.status)) {
      throw new Error("Invalid work plan update.");
    }
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ status: gaWorkPlanItems.status })
        .from(gaWorkPlanItems)
        .where(and(
          eq(gaWorkPlanItems.id, input.id),
          eq(gaWorkPlanItems.memberId, member.id),
        ))
        .limit(1);
      if (!existing) throw new Error("Work plan item was not found or is not yours.");
      if (existing.status === input.status) return;
      const rows = await tx
        .update(gaWorkPlanItems)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(
          eq(gaWorkPlanItems.id, input.id),
          eq(gaWorkPlanItems.memberId, member.id),
        ))
        .returning({ id: gaWorkPlanItems.id });
      if (!rows[0]) throw new Error("Work plan item was not found or is not yours.");
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: member.id,
        action: "ga.work_plan.status_updated",
        entityType: "ga_work_plan_item",
        entityId: input.id,
        metadata: { previousStatus: existing.status, status: input.status },
      });
    });
    revalidatePath("/activities");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to update GA work plan status", error);
    return { ok: false, error: error instanceof Error ? error.message : "The work plan could not be updated." };
  }
}

export async function setGaSpreadsheetPermissionAction(input: {
  memberId: string;
  enabled: boolean;
}): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try {
    if (user.role !== "administrator") {
      await recordAuthorizationDenied(user, "ga.spreadsheet.permission", { memberId: input.memberId });
      throw new Error("Only administrators can change spreadsheet permission.");
    }
    if (!uuidPattern.test(input.memberId) || typeof input.enabled !== "boolean") {
      throw new Error("Invalid spreadsheet permission update.");
    }

    const [member] = await db
      .select({
        id: technicians.id,
        name: technicians.name,
        role: technicians.role,
        isActive: technicians.isActive,
        divisionName: masterDivisions.name,
        isGaUnit: masterDivisions.isGaUnit,
        spreadsheetEnabled: technicians.spreadsheetEnabled,
      })
      .from(technicians)
      .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
      .where(eq(technicians.id, input.memberId))
      .limit(1);

    if (
      !member ||
      member.role !== "service_agent" ||
      !member.isActive ||
      !member.isGaUnit ||
      isITDivisionName(member.divisionName)
    ) {
      throw new Error("Spreadsheet permission is only available for active non-IT GA staff.");
    }
    if (member.spreadsheetEnabled === input.enabled) return { ok: true, data: undefined };

    await db.transaction(async (tx) => {
      await tx
        .update(technicians)
        .set({ spreadsheetEnabled: input.enabled, updatedAt: new Date() })
        .where(eq(technicians.id, input.memberId));
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: user.id,
        action: "ga.spreadsheet.permission_updated",
        entityType: "technician",
        entityId: input.memberId,
        metadata: { enabled: input.enabled, memberName: member.name },
      });
    });
    revalidatePath("/activities");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to update GA spreadsheet permission", error);
    return { ok: false, error: error instanceof Error ? error.message : "Spreadsheet permission could not be updated." };
  }
}

export async function saveGaSpreadsheetAction(form: FormData): Promise<ActionResult> {
  const user = await requireAuthenticatedUser();
  try {
    if (user.role !== "service_agent" || !user.divisionId || isITTeamUser(user)) {
      await recordAuthorizationDenied(user, "ga.spreadsheet.update");
      throw new Error("Only the permitted GA staff account can update this spreadsheet report.");
    }

    const [member] = await db
      .select({
        id: technicians.id,
        role: technicians.role,
        isActive: technicians.isActive,
        spreadsheetEnabled: technicians.spreadsheetEnabled,
        divisionName: masterDivisions.name,
        isGaUnit: masterDivisions.isGaUnit,
      })
      .from(technicians)
      .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
      .where(eq(technicians.id, user.id))
      .limit(1);
    if (
      !member ||
      member.role !== "service_agent" ||
      !member.isActive ||
      !member.isGaUnit ||
      isITDivisionName(member.divisionName) ||
      !member.spreadsheetEnabled
    ) {
      await recordAuthorizationDenied(user, "ga.spreadsheet.update", { reason: "permission_disabled" });
      throw new Error("Spreadsheet access has not been enabled by an administrator.");
    }

    const input = validateGaSpreadsheetInput({
      title: String(form.get("title") ?? ""),
      url: String(form.get("url") ?? ""),
      description: String(form.get("description") ?? ""),
    });
    const now = new Date();
    await db.transaction(async (tx) => {
      const rows = await tx
        .update(technicians)
        .set({
          spreadsheetTitle: input.title,
          spreadsheetUrl: input.url,
          spreadsheetDescription: input.description,
          spreadsheetUpdatedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(technicians.id, user.id),
          eq(technicians.spreadsheetEnabled, true),
        ))
        .returning({ id: technicians.id });
      if (!rows[0]) throw new Error("Spreadsheet permission is no longer active.");
      await tx.insert(auditLogs).values({
        actorType: "technician",
        actorId: user.id,
        action: "ga.spreadsheet.details_updated",
        entityType: "technician",
        entityId: user.id,
        metadata: { title: input.title, hasDescription: Boolean(input.description) },
      });
    });
    revalidatePath("/activities");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to update GA spreadsheet details", error);
    return { ok: false, error: error instanceof Error ? error.message : "Spreadsheet details could not be saved." };
  }
}

"use server";

import { isITRoleUser, requireITTeam } from "@/auth/session";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { ActionResult } from "@/data/types";
import { recordAuthorizationDenied } from "@/security/audit";

type ReportExportType = "troubleshooting" | "backup" | "survey";

export async function recordReportExportAction(input: {
  type: ReportExportType;
  mode: "range" | "month";
  startDate: string;
  endDate: string;
  month: string;
  recordCount: number;
}): Promise<ActionResult> {
  const currentUser = await requireITTeam("report.export");
  try {
    if (!["troubleshooting", "backup", "survey"].includes(input.type)) {
      throw new Error("Invalid report type.");
    }
    if (input.type !== "troubleshooting" && !isITRoleUser(currentUser)) {
      await recordAuthorizationDenied(currentUser, `report.${input.type}.export`);
      throw new Error("Your role cannot export this report.");
    }
    if (!Number.isSafeInteger(input.recordCount) || input.recordCount < 0 || input.recordCount > 100_000) {
      throw new Error("Invalid report record count.");
    }
    if (input.mode === "month" && !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(input.month)) {
      throw new Error("Invalid report month.");
    }
    if (input.mode === "range" && (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate) ||
      input.startDate > input.endDate
    )) {
      throw new Error("Invalid report date range.");
    }

    await db.insert(auditLogs).values({
      actorType: "technician",
      actorId: currentUser.id,
      action: "report.exported",
      entityType: "report",
      entityId: input.type,
      metadata: {
        mode: input.mode,
        month: input.mode === "month" ? input.month : null,
        startDate: input.mode === "range" ? input.startDate : null,
        endDate: input.mode === "range" ? input.endDate : null,
        recordCount: input.recordCount,
      },
    });
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("Unable to record report export.", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unable to record report export." };
  }
}

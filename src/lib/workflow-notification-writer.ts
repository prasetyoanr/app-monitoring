import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { technicians, workflowNotifications } from "@/db/schema";
import {
  workflowNotificationPlan,
  type WorkflowNotificationInput,
} from "@/lib/workflow-notifications";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Run inside the same transaction as the workflow change: the notifications are
// committed (or rolled back) together with the status they describe.
export async function recordWorkflowNotifications(
  tx: Tx,
  issueId: string,
  input: Omit<WorkflowNotificationInput, "pools">,
  note?: string | null,
) {
  const needed = (() => {
    switch (input.event) {
      case "submitted":
      case "returned":
        return ["receptionist", "approver"] as const;
      case "sent_for_approval":
        return ["approver"] as const;
      case "escalated":
        return ["final_approver"] as const;
      default:
        return [] as const;
    }
  })();

  const pools: WorkflowNotificationInput["pools"] = {};
  if (needed.length) {
    const rows = await tx
      .select({ id: technicians.id, role: technicians.role })
      .from(technicians)
      .where(and(eq(technicians.isActive, true), inArray(technicians.role, [...needed])));
    for (const row of rows) {
      if (row.role !== "receptionist" && row.role !== "approver" && row.role !== "final_approver") continue;
      (pools[row.role] ??= []).push(row.id);
    }
  }

  const targets = workflowNotificationPlan({ ...input, pools });
  if (!targets.length) return;
  await tx.insert(workflowNotifications).values(
    targets.map((target) => ({
      issueId,
      recipientId: target.recipientId,
      kind: target.kind,
      note: note || null,
    })),
  );
}

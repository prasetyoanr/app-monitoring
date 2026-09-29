import type { TicketRecord } from "@/data/types";

export function requestHistoryGroup(
  record: Pick<TicketRecord, "workflowEnabled" | "workflowStatus" | "status">,
): "active" | "completed" | "rejected" {
  if (record.workflowEnabled && record.workflowStatus === "rejected") return "rejected";
  if (record.workflowEnabled && record.workflowStatus === "resolved") return "completed";
  if (record.workflowEnabled && record.workflowStatus !== "assigned") return "active";
  return record.status === "Completed" ? "completed" : "active";
}

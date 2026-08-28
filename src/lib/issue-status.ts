import type { IssueStatus } from "@/data/types";

export function issueStatusLabel(status: IssueStatus) {
  return status === "Waiting for Client Approval" ? "Waiting Approval" : status;
}

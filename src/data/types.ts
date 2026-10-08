export type IssuePriority = "Low" | "Medium" | "High" | "Critical";
export type IssueSource = "manual" | "division_request";
export type AccountRole =
  | "administrator"
  | "receptionist"
  | "approver"
  | "final_approver"
  | "service_agent"
  | "requester";
export type RequestWorkflowStatus =
  | "submitted"
  | "waiting_approver"
  | "waiting_final_approver"
  | "ready_for_assignment"
  | "assigned"
  | "needs_revision"
  | "resolved"
  | "rejected";
export type RequestWorkflowCommand =
  | "send_for_approval"
  | "direct_assign"
  | "approve"
  | "escalate"
  | "return"
  | "reject"
  | "assign"
  | "resolve";

export interface ServiceAgentOption {
  id: string;
  name: string;
  divisionId: string;
  division: string;
  isGaUnit: boolean;
}
export type IssueStatus =
  | "New"
  | "In Progress"
  | "Waiting for Client Approval"
  | "Completed"
  | "Reopened";

export interface TicketRecord {
  id: string;
  title: string;
  category: string;
  requester: string;
  source: IssueSource;
  division: string;
  serviceDivision: string;
  receivingDivisionId?: string | null;
  inboxProfileKey: string;
  requestFormKey: string;
  requestData: Record<string, string>;
  location: string;
  reportedAt: string;
  reportedAtIso: string;
  updatedAtIso: string;
  reportedDate: string;
  priority: IssuePriority;
  status: IssueStatus;
  completedDays: number | null;
  // YYYY-MM-DD chosen by IT as the day the work was finished; empty until set.
  completionDate: string;
  description: string;
  hasWorkPhoto: boolean;
  workPhotoUrl: string | null;
  hasRequesterPhoto: boolean;
  requesterPhotoUrl: string | null;
  clientApproval: {
    clientName: string;
    approvedAt: string;
    approvedAtIso: string;
    signatureUrl: string;
  } | null;
  workflowStatus: RequestWorkflowStatus;
  workflowEnabled: boolean;
  workflowNote: string | null;
  approvalRequired: boolean | null;
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
}

export type BackupStatus = "Success" | "Failed" | "Overdue" | "Pending";

export interface BackupRecord {
  id: string;
  user: string;
  division: string;
  username: string;
  email: string;
  hasPasswordInformation: boolean;
  syncPath: string;
  submittedAt: string;
  submittedAtIso: string;
  status: BackupStatus;
}

export interface AccountRecord {
  id: string;
  name: string;
  username: string;
  role: AccountRole;
  divisionId: string | null;
  division: string | null;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

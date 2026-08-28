export type IssuePriority = "Low" | "Medium" | "High" | "Critical";
export type IssueSource = "manual" | "division_request";
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
  inboxProfileKey: string;
  requestFormKey: string;
  requestData: Record<string, string>;
  location: string;
  reportedAt: string;
  reportedDate: string;
  priority: IssuePriority;
  status: IssueStatus;
  completedDays: number | null;
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

export type AccountRole = "administrator" | "boss" | "technician" | "requester";

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

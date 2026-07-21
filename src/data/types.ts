export type IssuePriority = "Low" | "Medium" | "High" | "Critical";
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
  division: string;
  location: string;
  reportedAt: string;
  reportedDate: string;
  priority: IssuePriority;
  status: IssueStatus;
  completedDays: number | null;
  description: string;
  hasWorkPhoto: boolean;
  workPhotoUrl: string | null;
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

export type AccountRole = "administrator" | "boss";

export interface AccountRecord {
  id: string;
  name: string;
  username: string;
  role: AccountRole;
  isLocked: boolean;
  createdAt: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

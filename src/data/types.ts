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
  resolution: string;
}

export type BackupStatus = "Success" | "Failed" | "Overdue" | "Pending";

export interface BackupRecord {
  id: string;
  user: string;
  username: string;
  email: string;
  passwordInformation: string;
  hasPasswordInformation: boolean;
  syncPath: string;
  lastBackup: string;
  lastBackupIso: string;
  status: BackupStatus;
}

export type AccountRole = "administrator" | "boss";

export interface AccountRecord {
  id: string;
  name: string;
  username: string;
  role: AccountRole;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
}

export interface ServerRecord {
  name: string;
  role: string;
  ip: string;
  status: "Healthy" | "Warning" | "Critical";
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
}

export interface SurveyRecord {
  id: string;
  name: string;
  department: string;
  score: number;
  comment: string;
  ticket: string;
  respondedAt: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

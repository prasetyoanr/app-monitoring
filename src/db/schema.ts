import { sql } from "drizzle-orm";
import {
  bytea,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const technicianRoleEnum = pgEnum("technician_role", [
  "administrator",
  "boss",
]);

export const issuePriorityEnum = pgEnum("issue_priority", [
  "Low",
  "Medium",
  "High",
  "Critical",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "New",
  "In Progress",
  "Waiting for Client Approval",
  "Completed",
  "Reopened",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const backupStatusEnum = pgEnum("backup_status", [
  "Success",
  "Failed",
  "Overdue",
  "Pending",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "technician",
  "client",
  "system",
]);

export const serverStatusEnum = pgEnum("server_status", [
  "Healthy",
  "Warning",
  "Critical",
]);

export const technicians = pgTable(
  "technicians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    username: varchar("username", { length: 80 }),
    passwordHash: text("password_hash"),
    role: technicianRoleEnum("role").notNull().default("boss"),
    isActive: boolean("is_active").notNull().default(true),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("technicians_username_unique").on(table.username),
    check(
      "technicians_failed_login_attempts_check",
      sql`${table.failedLoginAttempts} >= 0`,
    ),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    // Only the SHA-256 hash is stored. The raw session token stays in the cookie.
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    technicianId: uuid("technician_id")
      .notNull()
      .references(() => technicians.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_sessions_technician_idx").on(table.technicianId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
    check(
      "auth_sessions_token_hash_format_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "auth_sessions_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const troubleshootingIssues = pgTable(
  "troubleshooting_issues",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    requesterName: varchar("requester_name", { length: 120 }).notNull(),
    requesterEmail: varchar("requester_email", { length: 254 }),
    division: varchar("division", { length: 120 }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull(),
    priority: issuePriorityEnum("priority").notNull(),
    status: issueStatusEnum("status").notNull().default("New"),
    completedDays: integer("completed_days"),
    description: text("description").notNull(),
    resolution: text("resolution").notNull().default(""),
    assignedTechnicianId: uuid("assigned_technician_id").references(
      () => technicians.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("troubleshooting_issues_status_idx").on(table.status),
    index("troubleshooting_issues_reported_at_idx").on(table.reportedAt),
    index("troubleshooting_issues_assignee_idx").on(
      table.assignedTechnicianId,
    ),
    check(
      "troubleshooting_issues_completed_days_check",
      sql`${table.completedDays} is null or ${table.completedDays} >= 0`,
    ),
  ],
);

export const troubleshootingApprovals = pgTable(
  "troubleshooting_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    issueId: varchar("issue_id", { length: 32 })
      .notNull()
      .references(() => troubleshootingIssues.id, { onDelete: "cascade" }),
    requestedByTechnicianId: uuid("requested_by_technician_id").references(
      () => technicians.id,
      { onDelete: "set null" },
    ),
    // The raw QR token is never stored. The server compares its SHA-256 hash.
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    status: approvalStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    clientName: varchar("client_name", { length: 120 }),
    clientNote: text("client_note"),
    signatureData: bytea("signature_data"),
    signatureMimeType: varchar("signature_mime_type", { length: 80 }),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("troubleshooting_approvals_token_hash_unique").on(
      table.tokenHash,
    ),
    index("troubleshooting_approvals_issue_idx").on(table.issueId),
    index("troubleshooting_approvals_status_expiry_idx").on(
      table.status,
      table.expiresAt,
    ),
    uniqueIndex("troubleshooting_approvals_one_pending_per_issue_unique")
      .on(table.issueId)
      .where(sql`${table.status} = 'pending'`),
    check(
      "troubleshooting_approvals_token_hash_format_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "troubleshooting_approvals_expiry_check",
      sql`${table.expiresAt} > ${table.requestedAt}`,
    ),
    check(
      "troubleshooting_approvals_signature_pair_check",
      sql`(${table.signatureData} is null and ${table.signatureMimeType} is null) or (${table.signatureData} is not null and ${table.signatureMimeType} is not null)`,
    ),
    check(
      "troubleshooting_approvals_decision_check",
      sql`(${table.status} <> 'approved' or (${table.clientName} is not null and ${table.signatureData} is not null and ${table.respondedAt} is not null)) and (${table.status} <> 'rejected' or (${table.clientName} is not null and ${table.respondedAt} is not null))`,
    ),
  ],
);

export const backupUsers = pgTable(
  "backup_users",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    username: varchar("username", { length: 120 }),
    email: varchar("email", { length: 254 }),
    // Operational text for backup needs, not an application login credential.
    passwordInformation: text("password_information"),
    syncPath: text("sync_path").notNull(),
    lastBackupAt: timestamp("last_backup_at", { withTimezone: true }),
    status: backupStatusEnum("status").notNull().default("Pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("backup_users_status_idx").on(table.status),
    index("backup_users_last_backup_at_idx").on(table.lastBackupAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    actorId: varchar("actor_id", { length: 120 }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const monitoredServers = pgTable(
  "monitored_servers",
  {
    name: varchar("name", { length: 120 }).primaryKey(),
    role: varchar("role", { length: 160 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    status: serverStatusEnum("status").notNull().default("Healthy"),
    cpuPercent: integer("cpu_percent").notNull(),
    memoryPercent: integer("memory_percent").notNull(),
    diskPercent: integer("disk_percent").notNull(),
    uptimeDays: integer("uptime_days").notNull().default(0),
    measuredAt: timestamp("measured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("monitored_servers_ip_unique").on(table.ipAddress),
    index("monitored_servers_status_idx").on(table.status),
    check(
      "monitored_servers_usage_check",
      sql`${table.cpuPercent} between 0 and 100 and ${table.memoryPercent} between 0 and 100 and ${table.diskPercent} between 0 and 100`,
    ),
    check("monitored_servers_uptime_check", sql`${table.uptimeDays} >= 0`),
  ],
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    issueReference: varchar("issue_reference", { length: 32 }).notNull(),
    clientName: varchar("client_name", { length: 120 }).notNull(),
    department: varchar("department", { length: 120 }).notNull(),
    score: integer("score").notNull(),
    comment: text("comment").notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("survey_responses_responded_at_idx").on(table.respondedAt),
    index("survey_responses_issue_idx").on(table.issueReference),
    check("survey_responses_score_check", sql`${table.score} between 1 and 5`),
  ],
);

export type Technician = typeof technicians.$inferSelect;
export type NewTechnician = typeof technicians.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type TroubleshootingIssue = typeof troubleshootingIssues.$inferSelect;
export type NewTroubleshootingIssue = typeof troubleshootingIssues.$inferInsert;
export type TroubleshootingApproval =
  typeof troubleshootingApprovals.$inferSelect;
export type NewTroubleshootingApproval =
  typeof troubleshootingApprovals.$inferInsert;
export type BackupUser = typeof backupUsers.$inferSelect;
export type NewBackupUser = typeof backupUsers.$inferInsert;
export type MonitoredServer = typeof monitoredServers.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

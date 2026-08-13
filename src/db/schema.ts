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
  "technician",
  "requester",
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

export const backupInvitationStatusEnum = pgEnum(
  "backup_invitation_status",
  ["pending", "submitted", "expired", "revoked"],
);

export const surveyFormStatusEnum = pgEnum("survey_form_status", [
  "draft",
  "active",
  "closed",
]);

export const surveyQuestionTypeEnum = pgEnum("survey_question_type", [
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "linear_scale",
]);

export const surveyKpiCategoryEnum = pgEnum("survey_kpi_category", [
  "installation",
  "repair",
]);

export const surveyAnalysisStatusEnum = pgEnum("survey_analysis_status", [
  "pending",
  "completed",
  "failed",
]);

export const surveySentimentLabelEnum = pgEnum("survey_sentiment_label", [
  "very_positive",
  "positive",
  "neutral",
  "negative",
  "very_negative",
  "not_applicable",
]);

export const masterDivisions = pgTable(
  "master_divisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("master_divisions_name_unique").on(sql`lower(${table.name})`),
  ],
);

export const masterLocations = pgTable(
  "master_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("master_locations_name_unique").on(sql`lower(${table.name})`),
  ],
);

export const masterCategories = pgTable(
  "master_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("master_categories_name_unique").on(sql`lower(${table.name})`),
  ],
);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "technician",
  "requester",
  "client",
  "system",
]);

export const technicians = pgTable(
  "technicians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    username: varchar("username", { length: 80 }),
    passwordHash: text("password_hash"),
    role: technicianRoleEnum("role").notNull().default("boss"),
    divisionId: uuid("division_id").references(() => masterDivisions.id, {
      onDelete: "set null",
    }),
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
    index("technicians_division_idx").on(table.divisionId),
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
    requesterId: uuid("requester_id").references(() => technicians.id, {
      onDelete: "set null",
    }),
    division: varchar("division", { length: 120 }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull(),
    priority: issuePriorityEnum("priority").notNull(),
    status: issueStatusEnum("status").notNull().default("New"),
    completedDays: integer("completed_days"),
    description: text("description").notNull(),
    resolution: text("resolution").notNull().default(""),
    workPhotoData: bytea("work_photo_data"),
    workPhotoMimeType: varchar("work_photo_mime_type", { length: 40 }),
    workPhotoFileName: varchar("work_photo_file_name", { length: 255 }),
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
    index("troubleshooting_issues_requester_idx").on(table.requesterId),
    check(
      "troubleshooting_issues_completed_days_check",
      sql`${table.completedDays} is null or ${table.completedDays} >= 0`,
    ),
    check(
      "troubleshooting_issues_work_photo_pair_check",
      sql`(${table.workPhotoData} is null and ${table.workPhotoMimeType} is null and ${table.workPhotoFileName} is null) or (${table.workPhotoData} is not null and ${table.workPhotoMimeType} is not null and ${table.workPhotoFileName} is not null)`,
    ),
    check(
      "troubleshooting_issues_work_photo_size_check",
      sql`${table.workPhotoData} is null or octet_length(${table.workPhotoData}) <= 2097152`,
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
    division: varchar("division", { length: 120 })
      .notNull()
      .default("Unassigned"),
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

export const backupUserInvitations = pgTable(
  "backup_user_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Only the SHA-256 hash is stored. The raw invitation token stays in the link.
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    status: backupInvitationStatusEnum("status").notNull().default("pending"),
    createdByTechnicianId: uuid("created_by_technician_id").references(
      () => technicians.id,
      { onDelete: "set null" },
    ),
    backupUserId: varchar("backup_user_id", { length: 32 }).references(
      () => backupUsers.id,
      { onDelete: "set null" },
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("backup_user_invitations_token_hash_unique").on(
      table.tokenHash,
    ),
    index("backup_user_invitations_status_expiry_idx").on(
      table.status,
      table.expiresAt,
    ),
    index("backup_user_invitations_backup_user_idx").on(table.backupUserId),
    check(
      "backup_user_invitations_token_hash_format_check",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "backup_user_invitations_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
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

export const surveyForms = pgTable(
  "survey_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    status: surveyFormStatusEnum("status").notNull().default("draft"),
    publicCode: varchar("public_code", { length: 16 }).notNull(),
    createdByTechnicianId: uuid("created_by_technician_id").references(
      () => technicians.id,
      { onDelete: "set null" },
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("survey_forms_public_code_unique").on(table.publicCode),
    index("survey_forms_status_created_idx").on(table.status, table.createdAt),
    check(
      "survey_forms_public_code_format_check",
      sql`${table.publicCode} ~ '^[A-Za-z0-9_-]{16}$'`,
    ),
  ],
);

export const surveyQuestions = pgTable(
  "survey_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveyForms.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    type: surveyQuestionTypeEnum("type").notNull(),
    kpiCategory: surveyKpiCategoryEnum("kpi_category"),
    title: varchar("title", { length: 500 }).notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    options: jsonb("options")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("survey_questions_survey_position_idx").on(
      table.surveyId,
      table.position,
    ),
    check("survey_questions_position_check", sql`${table.position} >= 0`),
  ],
);

export const surveySubmissions = pgTable(
  "survey_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveyForms.id, { onDelete: "cascade" }),
    clientName: varchar("client_name", { length: 120 }),
    division: varchar("division", { length: 120 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("survey_submissions_survey_submitted_idx").on(
      table.surveyId,
      table.submittedAt,
    ),
  ],
);

export const surveyAnswers = pgTable(
  "survey_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => surveySubmissions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<string | string[] | number>().notNull(),
  },
  (table) => [
    uniqueIndex("survey_answers_submission_question_unique").on(
      table.submissionId,
      table.questionId,
    ),
    index("survey_answers_question_idx").on(table.questionId),
  ],
);

export const surveyAnswerAnalyses = pgTable(
  "survey_answer_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => surveyAnswers.id, { onDelete: "cascade" }),
    status: surveyAnalysisStatusEnum("status").notNull().default("pending"),
    provider: varchar("provider", { length: 32 }).notNull().default("gemini"),
    model: varchar("model", { length: 120 }).notNull(),
    sentimentLabel: surveySentimentLabelEnum("sentiment_label"),
    sentimentScore: integer("sentiment_score"),
    confidencePercent: integer("confidence_percent"),
    summary: varchar("summary", { length: 500 }),
    errorMessage: varchar("error_message", { length: 500 }),
    manualScore: integer("manual_score"),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("survey_answer_analyses_answer_unique").on(table.answerId),
    index("survey_answer_analyses_status_idx").on(table.status),
    check(
      "survey_answer_analyses_score_check",
      sql`${table.sentimentScore} is null or ${table.sentimentScore} between 1 and 5`,
    ),
    check(
      "survey_answer_analyses_confidence_check",
      sql`${table.confidencePercent} is null or ${table.confidencePercent} between 0 and 100`,
    ),
    check(
      "survey_answer_analyses_manual_score_check",
      sql`${table.manualScore} is null or ${table.manualScore} between 1 and 5`,
    ),
  ],
);

// Legacy response storage retained for migration compatibility.
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

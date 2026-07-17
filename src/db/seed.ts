import "dotenv/config";

import { backupJobs, tickets } from "../data/mock-data";
import { db, pool } from "./connection";
import {
  backupUsers,
  surveyAnswers,
  surveyForms,
  surveyQuestions,
  surveySubmissions,
  technicians,
  troubleshootingIssues,
} from "./schema";
import { encryptBackupCredential } from "../security/backup-credentials";

const technicianId = "00000000-0000-4000-8000-000000000001";

async function seed() {
  await db
    .insert(technicians)
    .values({
      id: technicianId,
      name: "IT Team",
      role: "administrator",
    })
    .onConflictDoNothing();

  await db
    .insert(troubleshootingIssues)
    .values(
      tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        category: ticket.category,
        requesterName: ticket.requester,
        division: ticket.division,
        location: ticket.location,
        reportedAt: new Date(`${ticket.reportedDate}T00:00:00+07:00`),
        priority: ticket.priority as
          | "Low"
          | "Medium"
          | "High"
          | "Critical",
        status: ticket.status as
          | "New"
          | "In Progress"
          | "Waiting for Client Approval"
          | "Completed"
          | "Reopened",
        completedDays: ticket.completedDays,
        description: ticket.description,
        assignedTechnicianId: technicianId,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(backupUsers)
    .values(
      backupJobs.map((backup) => ({
        id: backup.id,
        fullName: backup.user,
        division: backup.division,
        username: backup.username || null,
        email: backup.email || null,
        passwordInformation: backup.password
          ? encryptBackupCredential(backup.password)
          : null,
        syncPath: backup.syncPath,
        lastBackupAt: new Date(`${backup.lastBackupIso}+07:00`),
        status: backup.status as "Success" | "Failed" | "Overdue" | "Pending",
      })),
    )
    .onConflictDoNothing();

  await db.insert(surveyForms).values({
    id: "00000000-0000-4000-8000-000000000201",
    title: "Imported IT Service Survey",
    description: "Historical client satisfaction responses imported from the previous survey feature.",
    status: "closed",
    publicCode: "legacySurvey2026",
  }).onConflictDoNothing();

  await db.insert(surveyQuestions).values([
    { id: "00000000-0000-4000-8000-000000000202", surveyId: "00000000-0000-4000-8000-000000000201", position: 0, type: "linear_scale", title: "Overall satisfaction", isRequired: true, options: [] },
    { id: "00000000-0000-4000-8000-000000000203", surveyId: "00000000-0000-4000-8000-000000000201", position: 1, type: "paragraph", title: "Comments", isRequired: false, options: [] },
    { id: "00000000-0000-4000-8000-000000000204", surveyId: "00000000-0000-4000-8000-000000000201", position: 2, type: "short_answer", title: "Troubleshooting reference", isRequired: false, options: [] },
  ]).onConflictDoNothing();

  const seededSurveyResponses = [
      {
        id: "00000000-0000-4000-8000-000000000101",
        clientName: "Sinta Maharani",
        department: "Finance",
        score: 5,
        comment: "Fast response, and the ERP access issue was resolved immediately.",
        issueReference: "INC-2026-0138",
        respondedAt: new Date("2026-07-14T08:48:00+07:00"),
      },
      {
        id: "00000000-0000-4000-8000-000000000102",
        clientName: "Dodi Firmansyah",
        department: "Warehouse",
        score: 4,
        comment: "Good service. I hope spare parts can be made available more quickly.",
        issueReference: "INC-2026-0134",
        respondedAt: new Date("2026-07-14T08:00:00+07:00"),
      },
      {
        id: "00000000-0000-4000-8000-000000000103",
        clientName: "Lina Wijaya",
        department: "Legal",
        score: 5,
        comment: "The explanation was easy to understand and very helpful.",
        issueReference: "INC-2026-0129",
        respondedAt: new Date("2026-07-14T06:00:00+07:00"),
      },
    ];
  await db.insert(surveySubmissions).values(seededSurveyResponses.map((response) => ({
    id: response.id,
    surveyId: "00000000-0000-4000-8000-000000000201",
    clientName: response.clientName,
    division: response.department,
    submittedAt: response.respondedAt,
  }))).onConflictDoNothing();
  await db.insert(surveyAnswers).values(seededSurveyResponses.flatMap((response) => [
    { submissionId: response.id, questionId: "00000000-0000-4000-8000-000000000202", value: response.score },
    { submissionId: response.id, questionId: "00000000-0000-4000-8000-000000000203", value: response.comment },
    { submissionId: response.id, questionId: "00000000-0000-4000-8000-000000000204", value: response.issueReference },
  ])).onConflictDoNothing();

  console.info("Database seed completed.");
}

seed()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

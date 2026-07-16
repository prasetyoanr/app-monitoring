import "dotenv/config";

import { backupJobs, servers, tickets } from "../data/mock-data";
import { db, pool } from "./connection";
import {
  backupUsers,
  monitoredServers,
  surveyResponses,
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

  await db
    .insert(monitoredServers)
    .values(
      servers.map((server) => ({
        name: server.name,
        role: server.role,
        ipAddress: server.ip,
        status: server.status as "Healthy" | "Warning" | "Critical",
        cpuPercent: server.cpu,
        memoryPercent: server.memory,
        diskPercent: server.disk,
        uptimeDays: Number.parseInt(server.uptime, 10),
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(surveyResponses)
    .values([
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
    ])
    .onConflictDoNothing();

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

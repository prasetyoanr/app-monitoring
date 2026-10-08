import "server-only";

import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { isITDivisionName, requireAuthenticatedUser, type AuthenticatedUser } from "@/auth/session";
import { db } from "@/db";
import { gaWorkPlanItems, masterDivisions, technicians, troubleshootingIssues } from "@/db/schema";
import type { GaWorkPlanStatus, GaWorkPlanTargetMode } from "@/lib/ga-work-plan";
import { GA_DIVISION_SLUGS, isGaDivisionSlug } from "@/lib/request-destination";

// Only these roles see the staff name list. Admin (receptionist) does not: like staff,
// Admin only gets their own workspace.
const supervisorRoles = new Set(["administrator", "approver", "final_approver"]);
export const GA_MEMBER_PAGE_SIZE = 20;

export interface GaMemberOption {
  id: string;
  name: string;
  divisionId: string;
  divisionName: string;
  divisionSlug: string;
  role: string;
}

// The "Add work plan" board belongs to the GA scope, not to one role: every role except
// requester whose division is General Affairs keeps its own plan. Global accounts and
// other units cannot; IT has its own plan format. The administrator is not tied to a
// division, so it does not keep a plan.
const workPlanRoles: ReadonlySet<string> = new Set(["service_agent", "receptionist", "approver", "final_approver"]);

export function canKeepGaWorkPlan(divisionSlug: string | null | undefined) {
  return isGaDivisionSlug(divisionSlug);
}

export function roleMayKeepGaWorkPlan(role: string) {
  return workPlanRoles.has(role);
}

export interface GaMemberSummary extends GaMemberOption {
  inboxCount: number;
  planCount: number;
  completedCount: number;
}

export interface GaMemberInboxRecord {
  id: string;
  title: string;
  location: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "New" | "In Progress" | "Waiting for Client Approval" | "Completed" | "Reopened";
  reportedAt: string;
  updatedAt: string;
}

export interface GaWorkPlanRecord {
  id: string;
  title: string;
  description: string;
  targetMode: GaWorkPlanTargetMode;
  targetDate: string | null;
  status: GaWorkPlanStatus;
  updatedAt: string;
}

export interface GaSpreadsheetRecord {
  enabled: boolean;
  title: string;
  description: string;
  url: string;
  hasLink: boolean;
  updatedAt: string | null;
}

function isSupervisor(user: AuthenticatedUser) {
  return supervisorRoles.has(user.role);
}

// Service agents of GA units, plus GA-scope Admin / First / Final Approval accounts. The
// staff list shown to supervisors is the service-agent subset; the others are only used
// to resolve a viewer's own workspace.
async function activeNonItGaMembers(): Promise<GaMemberOption[]> {
  const rows = await db
    .select({
      id: technicians.id,
      name: technicians.name,
      divisionId: masterDivisions.id,
      divisionName: masterDivisions.name,
      divisionSlug: masterDivisions.slug,
      role: technicians.role,
    })
    .from(technicians)
    .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(and(
      eq(technicians.isActive, true),
      or(
        and(eq(technicians.role, "service_agent"), eq(masterDivisions.isGaUnit, true)),
        and(inArray(technicians.role, ["receptionist", "approver", "final_approver"]), inArray(masterDivisions.slug, [...GA_DIVISION_SLUGS])),
      ),
    ))
    .orderBy(asc(technicians.name), asc(masterDivisions.name));

  return rows.filter((row) => !isITDivisionName(row.divisionName));
}

export async function getCurrentGaWorkPlanMember() {
  const user = await requireAuthenticatedUser();
  if (!roleMayKeepGaWorkPlan(user.role) || !user.divisionId || isITDivisionName(user.divisionName)) {
    throw new Error("Only accounts in the General Affairs scope can maintain a work plan.");
  }
  const [member] = await db
    .select({
      id: technicians.id,
      name: technicians.name,
      divisionId: masterDivisions.id,
      divisionName: masterDivisions.name,
      divisionSlug: masterDivisions.slug,
    })
    .from(technicians)
    .innerJoin(masterDivisions, eq(technicians.divisionId, masterDivisions.id))
    .where(and(
      eq(technicians.id, user.id),
      eq(technicians.isActive, true),
    ))
    .limit(1);
  if (!member || isITDivisionName(member.divisionName) || !canKeepGaWorkPlan(member.divisionSlug)) {
    throw new Error("Only accounts in the General Affairs scope can maintain a work plan.");
  }
  return member;
}

export async function getGaWorkspaceData(input: {
  requestedMemberId: string;
  weekStart: string;
  targetDate?: string;
  query: string;
  page: number;
}) {
  const user = await requireAuthenticatedUser();
  if (!["administrator", "receptionist", "approver", "final_approver", "service_agent"].includes(user.role)) redirect("/");
  if (user.role === "service_agent" && isITDivisionName(user.divisionName)) redirect("/inbox");

  const canSelectMembers = isSupervisor(user);
  const scopeMembers = await activeNonItGaMembers();
  // Supervisors (Administrator, First / Final Approval) browse every GA plan holder: staff
  // plus GA-scope Admin / First / Final Approval; everyone else only has their own.
  const allMembers = canSelectMembers
    ? scopeMembers
    : scopeMembers.filter((member) => member.id === user.id);
  if (!canSelectMembers && allMembers.length === 0) redirect("/");
  // Set when this supervisor (First/Final Approval) may also keep their own plan.
  const ownMember = canSelectMembers && roleMayKeepGaWorkPlan(user.role)
    ? scopeMembers.find((member) => member.id === user.id && canKeepGaWorkPlan(member.divisionSlug)) ?? null
    : null;
  const canKeepOwnPlan = Boolean(ownMember);

  const selectedMember = canSelectMembers
    ? ownMember && input.requestedMemberId === user.id
      ? ownMember
      : allMembers.find((member) => member.id === input.requestedMemberId) ?? null
    : allMembers[0] ?? null;
  if (!selectedMember) {
    const query = input.query.trim().toLocaleLowerCase("id-ID").slice(0, 80);
    // Own plan is opened through "My work plan", so it is not listed as a card.
    const listMembers = allMembers.filter((member) => member.id !== user.id);
    const filteredMembers = query
      ? listMembers.filter((member) => member.name.toLocaleLowerCase("id-ID").includes(query))
      : listMembers;
    const memberTotal = filteredMembers.length;
    const memberTotalPages = Math.max(1, Math.ceil(memberTotal / GA_MEMBER_PAGE_SIZE));
    const requestedPage = Number.isSafeInteger(input.page) && input.page > 0 ? input.page : 1;
    const memberPage = Math.min(requestedPage, memberTotalPages);
    const pageMembers = filteredMembers.slice(
      (memberPage - 1) * GA_MEMBER_PAGE_SIZE,
      memberPage * GA_MEMBER_PAGE_SIZE,
    );
    const memberIds = pageMembers.map((member) => member.id);
    const [inboxCounts, planCounts] = memberIds.length ? await Promise.all([
      db
        .select({
          memberId: troubleshootingIssues.assignedTechnicianId,
          value: count(),
        })
        .from(troubleshootingIssues)
        .where(and(
          eq(troubleshootingIssues.source, "division_request"),
          eq(troubleshootingIssues.workflowStatus, "assigned"),
          inArray(troubleshootingIssues.assignedTechnicianId, memberIds),
        ))
        .groupBy(troubleshootingIssues.assignedTechnicianId),
      db
        .select({
          memberId: gaWorkPlanItems.memberId,
          value: count(),
          completed: sql<number>`count(*) filter (where ${gaWorkPlanItems.status} = 'completed')`,
        })
        .from(gaWorkPlanItems)
        .where(and(
          eq(gaWorkPlanItems.weekStart, input.weekStart),
          input.targetDate ? or(
            eq(gaWorkPlanItems.targetDate, input.targetDate),
            eq(gaWorkPlanItems.targetMode, "until_completed"),
          ) : undefined,
          inArray(gaWorkPlanItems.memberId, memberIds),
        ))
        .groupBy(gaWorkPlanItems.memberId),
    ]) : [[], []];
    const inboxCountByMember = new Map(inboxCounts.map((row) => [row.memberId, Number(row.value)]));
    const planCountByMember = new Map(planCounts.map((row) => [row.memberId, {
      total: Number(row.value),
      completed: Number(row.completed),
    }]));
    const members: GaMemberSummary[] = pageMembers.map((member) => ({
      ...member,
      inboxCount: inboxCountByMember.get(member.id) ?? 0,
      planCount: planCountByMember.get(member.id)?.total ?? 0,
      completedCount: planCountByMember.get(member.id)?.completed ?? 0,
    }));
    return {
      user,
      canSelectMembers,
      canKeepOwnPlan,
      members,
      memberPage,
      memberTotal,
      memberTotalPages,
      selectedMember: null,
      inbox: [] as GaMemberInboxRecord[],
      workPlans: [] as GaWorkPlanRecord[],
      spreadsheet: null as GaSpreadsheetRecord | null,
    };
  }

  const canViewSpreadsheet = user.role === "administrator" || user.id === selectedMember.id;
  const [inboxRows, planRows, spreadsheetRows] = await Promise.all([
    db
      .select({
        id: troubleshootingIssues.id,
        title: troubleshootingIssues.title,
        location: troubleshootingIssues.location,
        priority: troubleshootingIssues.priority,
        status: troubleshootingIssues.status,
        reportedAt: troubleshootingIssues.reportedAt,
        updatedAt: troubleshootingIssues.updatedAt,
      })
      .from(troubleshootingIssues)
      .where(and(
        eq(troubleshootingIssues.source, "division_request"),
        eq(troubleshootingIssues.workflowStatus, "assigned"),
        eq(troubleshootingIssues.assignedTechnicianId, selectedMember.id),
      ))
      .orderBy(desc(troubleshootingIssues.updatedAt), desc(troubleshootingIssues.id))
      .limit(50),
    db
      .select({
        id: gaWorkPlanItems.id,
        title: gaWorkPlanItems.title,
        description: gaWorkPlanItems.description,
        targetMode: gaWorkPlanItems.targetMode,
        targetDate: gaWorkPlanItems.targetDate,
        status: gaWorkPlanItems.status,
        updatedAt: gaWorkPlanItems.updatedAt,
      })
      .from(gaWorkPlanItems)
      .where(and(
        eq(gaWorkPlanItems.memberId, selectedMember.id),
        eq(gaWorkPlanItems.weekStart, input.weekStart),
        input.targetDate ? or(
          eq(gaWorkPlanItems.targetDate, input.targetDate),
          eq(gaWorkPlanItems.targetMode, "until_completed"),
        ) : undefined,
      ))
      .orderBy(asc(gaWorkPlanItems.targetDate), desc(gaWorkPlanItems.updatedAt)),
    canViewSpreadsheet
      ? db
        .select({
          enabled: technicians.spreadsheetEnabled,
          title: technicians.spreadsheetTitle,
          url: technicians.spreadsheetUrl,
          description: technicians.spreadsheetDescription,
          updatedAt: technicians.spreadsheetUpdatedAt,
        })
        .from(technicians)
        .where(eq(technicians.id, selectedMember.id))
        .limit(1)
      : Promise.resolve([]),
  ]);

  const spreadsheetRow = spreadsheetRows[0];
  const spreadsheet = spreadsheetRow ? {
    enabled: spreadsheetRow.enabled,
    title: spreadsheetRow.title ?? "",
    description: spreadsheetRow.description ?? "",
    url: user.id === selectedMember.id ? spreadsheetRow.url ?? "" : "",
    hasLink: Boolean(spreadsheetRow.url),
    updatedAt: spreadsheetRow.updatedAt?.toISOString() ?? null,
  } : null;

  return {
    user,
    canSelectMembers,
    canKeepOwnPlan,
    members: [] as GaMemberSummary[],
    memberPage: 1,
    memberTotal: allMembers.length,
    memberTotalPages: Math.max(1, Math.ceil(allMembers.length / GA_MEMBER_PAGE_SIZE)),
    selectedMember,
    inbox: inboxRows.map((row): GaMemberInboxRecord => ({
      ...row,
      reportedAt: row.reportedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    workPlans: planRows.map((row): GaWorkPlanRecord => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
    })),
    spreadsheet,
  };
}

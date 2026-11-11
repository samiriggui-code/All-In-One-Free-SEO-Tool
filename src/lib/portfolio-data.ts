/**
 * Reads behind the portfolio views (dashboard, global Audits, global
 * Reports), limited to the projects the signed-in user may see. The sums
 * themselves are in portfolio.ts.
 */

import { and, desc, eq, gte, inArray, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db/client";
import { audits, clients, missions, reportArchives, reportSchedules, tasks } from "@/db/schema";
import type { MissionKind } from "./mission-kinds";
import { projectStage, type ProjectStage } from "./missions";
import type { Priority } from "./portfolio";

export type PortfolioProject = {
  id: number;
  name: string;
  url: string;
  logoUrl: string | null;
  stage: ProjectStage;
  /** Active or proposed missions. */
  missions: MissionKind[];
  /** Latest completed audit scores, oldest first (8 at most). */
  scores: number[];
  lastAuditAt: Date | null;
  openTasks: number;
  urgentTasks: number;
};

export type PortfolioTask = {
  id: number;
  title: string;
  priority: Priority;
  status: string;
  dueDate: Date | null;
  clientId: number;
  clientName: string;
};

async function projectIds(): Promise<number[] | null> {
  // Imported here: client-scope reads the request (cookies).
  const { scopedClientIds } = await import("./client-scope");
  return scopedClientIds();
}

function inScope(column: AnyColumn, scope: number[] | null) {
  return scope === null ? undefined : inArray(column, scope.length > 0 ? scope : [-1]);
}

export async function loadPortfolio(now = new Date()): Promise<{
  projects: PortfolioProject[];
  openTasks: PortfolioTask[];
  /** When each task finished, for the last eight weeks. */
  doneDates: Date[];
  auditsThisMonth: number;
}> {
  const scope = await projectIds();
  const projectRows = await db
    .select({ id: clients.id, name: clients.name, url: clients.url, logoUrl: clients.logoUrl })
    .from(clients)
    .where(inScope(clients.id, scope))
    .orderBy(clients.name);
  if (projectRows.length === 0) return { projects: [], openTasks: [], doneDates: [], auditsThisMonth: 0 };
  const ids = projectRows.map((p) => p.id);

  const auditRows = await db
    .select({
      clientId: audits.clientId,
      score: audits.score,
      mode: audits.mode,
      completedAt: audits.completedAt,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .where(and(inArray(audits.clientId, ids), eq(audits.status, "completed"), eq(audits.kind, "crawler")))
    .orderBy(desc(audits.completedAt));

  const missionRows = await db
    .select({ clientId: missions.clientId, kind: missions.kind, status: missions.status })
    .from(missions)
    .where(inArray(missions.clientId, ids));

  const openRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      clientId: tasks.clientId,
    })
    .from(tasks)
    .where(and(inArray(tasks.clientId, ids), inArray(tasks.status, ["todo", "in_progress"])));

  const eightWeeksAgo = new Date(now.getTime() - 63 * 86_400_000);
  const doneRows = await db
    .select({ at: tasks.updatedAt })
    .from(tasks)
    .where(and(inArray(tasks.clientId, ids), eq(tasks.status, "done"), gte(tasks.updatedAt, eightWeeksAgo)));

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [{ n: auditsThisMonth }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(audits)
    .where(and(inArray(audits.clientId, ids), eq(audits.kind, "crawler"), gte(audits.createdAt, monthStart)));

  const nameOf = new Map(projectRows.map((p) => [p.id, p.name]));
  const projects = projectRows.map((p): PortfolioProject => {
    const done = auditRows.filter((a) => a.clientId === p.id);
    const open = openRows.filter((t) => t.clientId === p.id);
    return {
      ...p,
      stage: projectStage({
        // Rows written before the mode column existed were full crawls.
        fullAuditDone: done.some((a) => a.mode !== "quick"),
        quickAuditDone: done.some((a) => a.mode === "quick"),
      }),
      missions: missionRows
        .filter((m) => m.clientId === p.id && (m.status === "active" || m.status === "proposed"))
        .map((m) => m.kind),
      scores: done
        .slice(0, 8)
        .map((a) => a.score)
        .filter((s): s is number => s !== null)
        .reverse(),
      lastAuditAt: done[0] ? (done[0].completedAt ?? done[0].createdAt) : null,
      openTasks: open.length,
      urgentTasks: open.filter((t) => t.priority === "high").length,
    };
  });

  return {
    projects,
    openTasks: openRows
      .filter((t): t is typeof t & { clientId: number } => t.clientId !== null)
      .map((t) => ({ ...t, clientName: nameOf.get(t.clientId) ?? "" })),
    doneDates: doneRows.map((r) => r.at).filter((d): d is Date => d instanceof Date),
    auditsThisMonth: Number(auditsThisMonth),
  };
}

export type AuditRow = {
  id: number;
  clientId: number;
  clientName: string;
  mode: string | null;
  status: string;
  score: number | null;
  issuesCount: number;
  at: Date;
};

/** Every audit of the visible projects, newest first. */
export async function loadAllAudits(limit = 100): Promise<AuditRow[]> {
  const scope = await projectIds();
  const rows = await db
    .select({
      id: audits.id,
      clientId: audits.clientId,
      clientName: clients.name,
      mode: audits.mode,
      status: audits.status,
      score: audits.score,
      issuesCount: audits.issuesCount,
      completedAt: audits.completedAt,
      createdAt: audits.createdAt,
    })
    .from(audits)
    .innerJoin(clients, eq(audits.clientId, clients.id))
    .where(and(eq(audits.kind, "crawler"), inScope(audits.clientId, scope)))
    .orderBy(desc(audits.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.clientName,
    mode: r.mode,
    status: r.status,
    score: r.score,
    issuesCount: r.issuesCount,
    at: r.completedAt ?? r.createdAt,
  }));
}

export type ReportProject = {
  id: number;
  name: string;
  url: string;
  lastReportAt: Date | null;
  lastReportStatus: string | null;
  schedule: { frequency: "weekly" | "monthly"; nextSendAt: Date | null } | null;
};

export type RecentReport = {
  id: number;
  clientId: number;
  clientName: string;
  title: string;
  status: string;
  createdAt: Date;
};

/** Per project: last report made and the schedule that sends the next one. */
export async function loadReportsOverview(): Promise<{ projects: ReportProject[]; recent: RecentReport[] }> {
  const scope = await projectIds();
  const projectRows = await db
    .select({ id: clients.id, name: clients.name, url: clients.url })
    .from(clients)
    .where(inScope(clients.id, scope))
    .orderBy(clients.name);
  if (projectRows.length === 0) return { projects: [], recent: [] };
  const ids = projectRows.map((p) => p.id);

  const archiveRows = await db
    .select({
      id: reportArchives.id,
      clientId: reportArchives.clientId,
      title: reportArchives.title,
      status: reportArchives.status,
      createdAt: reportArchives.createdAt,
    })
    .from(reportArchives)
    .where(inArray(reportArchives.clientId, ids))
    .orderBy(desc(reportArchives.createdAt));

  const scheduleRows = await db
    .select({
      clientId: reportSchedules.clientId,
      frequency: reportSchedules.frequency,
      nextSendAt: reportSchedules.nextSendAt,
    })
    .from(reportSchedules)
    .where(and(inArray(reportSchedules.clientId, ids), eq(reportSchedules.enabled, true)));

  const nameOf = new Map(projectRows.map((p) => [p.id, p.name]));
  return {
    projects: projectRows.map((p) => {
      const last = archiveRows.find((a) => a.clientId === p.id);
      const next = scheduleRows
        .filter((s) => s.clientId === p.id)
        .sort((a, b) => (a.nextSendAt?.getTime() ?? Infinity) - (b.nextSendAt?.getTime() ?? Infinity))[0];
      return {
        ...p,
        lastReportAt: last?.createdAt ?? null,
        lastReportStatus: last?.status ?? null,
        schedule: next ? { frequency: next.frequency, nextSendAt: next.nextSendAt } : null,
      };
    }),
    recent: archiveRows.slice(0, 10).map((a) => ({ ...a, clientName: nameOf.get(a.clientId) ?? "" })),
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditIssues, audits } from "@/db/schema";
import { requireClientAccess } from "@/lib/auth";

type IssueStatus = "new" | "resolved" | "ignored" | "false_positive";

/** The caller must be able to edit the client the audit belongs to. */
async function requireAuditEdit(auditId: number) {
  const row = db
    .select({ clientId: audits.clientId })
    .from(audits)
    .where(eq(audits.id, auditId))
    .get();
  if (!row) return false;
  await requireClientAccess(row.clientId, { edit: true });
  return true;
}

export async function setIssueStatus(
  issueId: number,
  status: IssueStatus,
  auditId: number,
) {
  if (!Number.isFinite(issueId) || issueId <= 0) return;
  const issue = db
    .select({ auditId: auditIssues.auditId })
    .from(auditIssues)
    .where(eq(auditIssues.id, issueId))
    .get();
  if (!issue || !(await requireAuditEdit(issue.auditId))) return;
  await db
    .update(auditIssues)
    .set({ status, updatedAt: new Date() })
    .where(eq(auditIssues.id, issueId));
  revalidatePath(`/audits/${auditId}`);
}

export async function setStatusForType(
  auditId: number,
  type: string,
  status: IssueStatus,
) {
  if (!Number.isFinite(auditId) || auditId <= 0) return;
  if (!(await requireAuditEdit(auditId))) return;
  const rows = await db
    .select({ id: auditIssues.id })
    .from(auditIssues)
    .where(and(eq(auditIssues.auditId, auditId), eq(auditIssues.type, type)));
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return;
  await db
    .update(auditIssues)
    .set({ status, updatedAt: new Date() })
    .where(inArray(auditIssues.id, ids));
  revalidatePath(`/audits/${auditId}`);
}

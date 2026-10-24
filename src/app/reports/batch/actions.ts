"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { reportArchives, reportSchedules } from "@/db/schema";
import { canSeeClient, currentUser, visibleClientIds } from "@/lib/auth";
import {
  getBatchProgress,
  startReportBatch,
  type BatchProgress,
} from "@/lib/report-batch";
import { sendReportEmail } from "@/lib/report-mailer";
import type { ReportTemplate } from "@/lib/report-generator";
import { getTranslations } from "next-intl/server";

const errorsT = () => getTranslations("auditUi.reports.batch.errors");

export async function startBatch(input: {
  clientIds: number[];
  template: ReportTemplate;
  periodStart?: string;
  periodEnd?: string;
}): Promise<{ ok: true; batchId: number } | { ok: false; error: string }> {
  await requireSignedIn();
  // Only generate for clients the caller can see. Otherwise a member
  // presses "generate all" and produces reports for the rest of the
  // agency's book — including PDFs full of data they were never given
  // access to, sitting in a queue they can open.
  const scope = await visibleClientIds(await currentUser());
  const ids =
    scope === null ? input.clientIds : input.clientIds.filter((id) => scope.includes(id));

  if (ids.length === 0) {
    return { ok: false, error: (await errorsT())("noneYours") };
  }

  return startReportBatch({
    clientIds: ids,
    template: input.template,
    periodStart: input.periodStart ? new Date(input.periodStart) : null,
    periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
  });
}

export async function pollBatch(batchId: number): Promise<BatchProgress | null> {
  await requireSignedIn();
  return getBatchProgress(batchId);
}

async function guard(
  reportId: number,
): Promise<
  | { ok: true; report: typeof reportArchives.$inferSelect }
  | { ok: false; error: string }
> {
  const [report] = await db
    .select()
    .from(reportArchives)
    .where(eq(reportArchives.id, reportId))
    .limit(1);
  // Same answer for missing and forbidden — "that report belongs to
  // another client" confirms the client exists.
  if (!report) return { ok: false, error: (await errorsT())("noSuchReport") };
  if (!(await canSeeClient(await currentUser(), report.clientId))) {
    return { ok: false, error: (await errorsT())("noSuchReport") };
  }
  return { ok: true, report };
}

export async function approveReport(
  reportId: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireSignedIn();
  const g = await guard(reportId);
  if (!g.ok) return g;
  if (g.report.status === "failed") {
    return {
      ok: false,
      error: (await errorsT())("nothingToApprove"),
    };
  }

  await db
    .update(reportArchives)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(reportArchives.id, reportId));
  revalidatePath("/reports/batch");
  return { ok: true };
}

export async function rejectReport(
  reportId: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireSignedIn();
  const g = await guard(reportId);
  if (!g.ok) return g;
  await db
    .update(reportArchives)
    .set({ status: "rejected", reviewedAt: new Date() })
    .where(eq(reportArchives.id, reportId));
  revalidatePath("/reports/batch");
  return { ok: true };
}

/**
 * Send an approved report to the client.
 *
 * Refuses anything not explicitly approved. That refusal is the whole
 * safety property of this workflow — without it, "send all" would
 * deliver drafts nobody read, which is the failure the review step
 * exists to prevent.
 */
export async function sendReport(
  reportId: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireSignedIn();
  const g = await guard(reportId);
  if (!g.ok) return g;

  const t = await errorsT();
  if (g.report.status !== "approved") {
    return {
      ok: false,
      error: g.report.status === "sent" ? t("alreadySent") : t("approveFirst"),
    };
  }
  if (!g.report.pdfBase64) {
    return { ok: false, error: t("noPdf") };
  }

  // Recipients come from the client's existing report schedule. There is
  // no separate "who gets the monthly report" field, and inventing one
  // would give the same client two answers that could disagree.
  const [schedule] = await db
    .select({ recipients: reportSchedules.recipients })
    .from(reportSchedules)
    .where(eq(reportSchedules.clientId, g.report.clientId))
    .limit(1);

  const recipients = (schedule?.recipients ?? []).filter(Boolean);
  if (recipients.length === 0) {
    return {
      ok: false,
      error: t("noRecipients"),
    };
  }

  const result = await sendReportEmail({
    clientId: g.report.clientId,
    template: (g.report.template ?? "detailed") as ReportTemplate,
    recipients,
    // Send the approved bytes, not a fresh render — see sendReportEmail.
    pdf: Buffer.from(g.report.pdfBase64, "base64"),
  }).catch((err) => ({ ok: false as const, error: (err as Error).message }));

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? t("sendFailed"),
    };
  }

  await db
    .update(reportArchives)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(reportArchives.id, reportId));
  revalidatePath("/reports/batch");
  return { ok: true };
}

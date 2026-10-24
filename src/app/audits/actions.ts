"use server";

import { redirect } from "next/navigation";
import { safeRevalidatePath } from "@/lib/safe-revalidate";
import { and, desc, eq, inArray, like, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { audits, auditIssues, auditRuleHistory, clients, tasks } from "@/db/schema";
import { runAudit } from "@/lib/audit";
import { findingsToTasks } from "@/lib/audit-to-task";
import { withoutInfrastructure } from "@/lib/infrastructure-urls";
import { confidenceForIssue } from "@/lib/audit-confidence";
import { notify, type NotificationField } from "@/lib/notifier";
import { logActivity } from "@/lib/activity";
import { runAutomations } from "@/lib/automation-engine";
import {
  runSeomatorAudit,
  seomatorFindingsToTasks,
  type SeomatorBridgeResult,
} from "@/lib/seomator-audit";
import { normalizeSeomatorReport } from "@/lib/cabinet/normalize";
import { getCategoryIds } from "@/audit";
import {
  dropCovered,
  ENGINE_MAX_PAGES,
  isAuditMode,
  type AuditMode,
} from "@/lib/audit-engine";
import {
  auditPreviewAbsolutePath,
  auditPreviewRelativePath,
} from "@/lib/audit-preview-screenshot";
import {
  initialSeomatorProgress,
  progressOnCategoryComplete,
  progressOnCategoryStart,
  progressOnRuleComplete,
  type SeomatorAuditProgress,
} from "@/lib/seomator-audit-progress";
import { existsSync } from "node:fs";
import { runGeoSiteAudit } from "@/lib/geo-audit";

const SCORE_DROP_THRESHOLD = 5;
const STALLED_AFTER_MS = 10 * 60 * 1000;

/**
 * If an audit is genuinely in flight, send the user there. If it has
 * stalled, mark it failed and return null so a new run can start.
 */
async function takeOverOrRedirectInFlight(clientId: number): Promise<void> {
  const [inFlight] = await db
    .select({ id: audits.id, startedAt: audits.startedAt })
    .from(audits)
    .where(and(eq(audits.clientId, clientId), eq(audits.status, "running")))
    .orderBy(desc(audits.startedAt))
    .limit(1);

  if (inFlight?.startedAt) {
    const age = Date.now() - inFlight.startedAt.getTime();
    if (age < STALLED_AFTER_MS) {
      redirect(`/audits/${inFlight.id}`);
    }
    await db
      .update(audits)
      .set({
        status: "failed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(audits.id, inFlight.id));
  }
}

/**
 * Run the site audit for a client: SEO Tool's crawl and checks, then the
 * technical rule engine (373 rules, 20 weighted categories) and the GEO
 * audit, into one audit row.
 *
 * `input` is the mode, or the form that submitted it (a bound server
 * action receives the FormData as its second argument): a `mode` field of
 * "full" adds browser rendering, Core Web Vitals and a deeper crawl;
 * anything else runs the quick audit.
 */
export async function runAuditForClient(
  clientId: number,
  input?: FormData | AuditMode,
) {
  const requested = input instanceof FormData ? input.get("mode") : input;
  const mode: AuditMode = isAuditMode(requested) ? requested : "quick";
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) return;

  await takeOverOrRedirectInFlight(clientId);

  // Look up previous completed audit BEFORE running the new one,
  // so we can compute score delta on completion.
  const [previousAudit] = await db
    .select()
    .from(audits)
    .where(
      and(eq(audits.clientId, clientId), eq(audits.status, "completed")),
    )
    .orderBy(desc(audits.completedAt))
    .limit(1);
  const previousScore = previousAudit?.score ?? null;

  const startedAt = new Date();
  let progressState: SeomatorAuditProgress = initialSeomatorProgress(
    getCategoryIds(),
  );
  const [auditRow] = await db
    .insert(audits)
    .values({
      clientId,
      status: "running",
      mode,
      targetUrl: client.url,
      startedAt,
      progressJson: progressState,
    })
    .returning({ id: audits.id });

  let result;
  try {
    // Write the running page count as the crawl goes, so the client page
    // and the onboarding wizard can show a real progress bar. A crawl can
    // run for minutes; with no signal it is indistinguishable from a hang.
    // Fire-and-forget: a slow write must never pace the crawler, and a
    // failed one must never fail the audit.
    let lastWrite = 0;
    result = await runAudit(client.url, {
      onProgress: (crawled) => {
        const now = Date.now();
        // 300ms, not 700: at 700 a fast 8-page crawl landed exactly one
        // write, so the bar sat at 1 and then jumped to done. Writes are
        // local SQLite and bounded by the crawl rate either way.
        if (now - lastWrite < 300) return; // cap DB writes, not the crawl
        lastWrite = now;
        void db
          .update(audits)
          .set({ pagesCrawled: crawled })
          .where(eq(audits.id, auditRow.id))
          .catch(() => {});
      },
    });
  } catch {
    await db
      .update(audits)
      .set({
        status: "failed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(audits.id, auditRow.id));

    // Fire-and-forget — don't block the UI on a webhook failure
    notify({
      title: `Audit failed for ${client.name}`,
      body: `Couldn't reach ${client.url}. Try running the audit again, or check the site is online.`,
      level: "error",
      fields: [{ label: "Client", value: client.name }],
    }).catch(() => {});

    await logActivity({
      kind: "audit.failed",
      message: `Audit failed for ${client.name} — site unreachable.`,
      level: "error",
      clientId,
      entityType: "audit",
      entityId: auditRow.id,
    });

    await runAutomations("audit_failed", {
      clientId,
      clientName: client.name,
      data: { url: client.url, auditId: auditRow.id },
    });

    safeRevalidatePath(`/clients/${clientId}`);
    return;
  }

  // The rule engine reads the same site. Its failure never fails the
  // audit: the crawl above already stands on its own, with its own score.
  let lastProgressWrite = 0;
  const persistProgress = (pagesCrawled?: number) => {
    const now = Date.now();
    if (now - lastProgressWrite < 300) return;
    lastProgressWrite = now;
    void db
      .update(audits)
      .set({
        progressJson: progressState,
        ...(pagesCrawled !== undefined ? { pagesCrawled } : {}),
      })
      .where(eq(audits.id, auditRow.id))
      .catch(() => {});
  };
  progressState = { ...progressState, phase: "crawl", updatedAt: new Date().toISOString() };
  let engine: SeomatorBridgeResult | null = null;
  try {
    engine = await runSeomatorAudit(result.url, {
      mode,
      maxPages: ENGINE_MAX_PAGES[mode],
      ...(mode === "full" && {
        previewScreenshotPath: auditPreviewAbsolutePath(auditRow.id),
        onPreviewScreenshot: () => {
          void db
            .update(audits)
            .set({ previewScreenshotPath: auditPreviewRelativePath(auditRow.id) })
            .where(eq(audits.id, auditRow.id))
            .catch(() => {});
        },
      }),
      onCrawlProgress: (crawled) => {
        progressState = {
          ...progressState,
          pagesCrawled: crawled,
          updatedAt: new Date().toISOString(),
        };
        persistProgress();
      },
      onCategoryStart: (categoryId, categoryName) => {
        progressState = progressOnCategoryStart(progressState, categoryId, categoryName);
        persistProgress();
      },
      onCategoryComplete: (categoryId, _categoryName, categoryResult) => {
        progressState = progressOnCategoryComplete(progressState, categoryId, categoryResult);
        persistProgress();
      },
      onRuleComplete: (_ruleId, ruleName) => {
        progressState = progressOnRuleComplete(progressState, ruleName);
        persistProgress();
      },
    });
  } catch {
    engine = null;
  }

  let geoResult: Awaited<ReturnType<typeof runGeoSiteAudit>> | null = null;
  try {
    geoResult = await runGeoSiteAudit(result.url, {
      mode,
      maxPages: ENGINE_MAX_PAGES[mode],
    });
  } catch {
    geoResult = null;
  }
  const geoFindings = geoResult?.findings ?? [];

  // Infrastructure URLs out before anything is stored or turned into work.
  //
  // The crawler skips them now, but this is the one place every finding
  // passes through on its way into the database, so a guard here catches
  // every source. Before it, a Cloudflare email-protection link became a
  // "critical" finding on every crawl and four generators made tasks of it.
  //
  // Engine findings that repeat one of SEO Tool's own checks on the same
  // page are dropped: the check's type is the one the agent can fix.
  const crawlFindings = withoutInfrastructure(result.findings);
  const engineFindings = engine
    ? withoutInfrastructure(dropCovered(engine.findings, crawlFindings))
    : [];
  const realFindings = [...crawlFindings, ...engineFindings];

  if (realFindings.length > 0) {
    // Carry forward issue status (ignored / resolved / false_positive)
    // from prior audits — same (type, url) on the same client. Without
    // this, every re-run resurrects issues the user previously dismissed.
    const priorIssues = await db
      .select({
        type: auditIssues.type,
        url: auditIssues.url,
        status: auditIssues.status,
      })
      .from(auditIssues)
      .innerJoin(audits, eq(audits.id, auditIssues.auditId))
      .where(
        and(
          eq(audits.clientId, clientId),
          ne(auditIssues.status, "new"),
        ),
      );
    const statusByKey = new Map<string, string>();
    for (const p of priorIssues) {
      if (p.type && p.url) statusByKey.set(`${p.type}::${p.url}`, p.status);
    }
    await db.insert(auditIssues).values(
      realFindings.map((f) => {
        const inheritedStatus = statusByKey.get(`${f.type}::${f.url}`);
        return {
          auditId: auditRow.id,
          type: f.type,
          severity: f.severity,
          url: f.url,
          message: f.message,
          ...(f.category && { category: f.category }),
          ...(f.fixSteps && { fixSteps: f.fixSteps }),
          confidence:
            f.confidence ??
            confidenceForIssue({
              type: f.type,
              aiGenerated: false,
              severity: f.severity,
            }),
          ...(inheritedStatus
            ? { status: inheritedStatus as "ignored" | "resolved" | "false_positive" }
            : {}),
        };
      }),
    );

    const generatedTasks = findingsToTasks(crawlFindings);
    if (generatedTasks.length > 0) {
      // One open task per finding type, however many times the site is
      // audited. This inserted every blueprint again on every run and
      // tagged none of them, so a client audited twice had "Fix server
      // error on homepage" twice — and one audited weekly would have had
      // it fifty times. A task somebody finished may come back if the
      // problem does; an open one is never doubled.
      const open = await db
        .select({ sourceRef: tasks.sourceRef })
        .from(tasks)
        .where(
          and(
            eq(tasks.clientId, clientId),
            like(tasks.sourceRef, "audit:%"),
            inArray(tasks.status, ["todo", "in_progress"]),
          ),
        );
      const alreadyOpen = new Set(open.map((t) => t.sourceRef));
      const fresh = generatedTasks.filter(
        (t) => !alreadyOpen.has(`audit:${t.type}`),
      );

      const now = Date.now();
      const dayMs = 86_400_000;
      if (fresh.length > 0) {
        await db.insert(tasks).values(
          fresh.map((t) => ({
            clientId,
            title: t.title,
            description: t.description,
            whyItMatters: t.whyItMatters,
            priority: t.priority,
            toolPath: t.toolPath,
            status: "todo" as const,
            sourceRef: `audit:${t.type}`,
            dueDate:
              t.priority === "high"
                ? new Date(now + 7 * dayMs)
                : t.priority === "medium"
                  ? new Date(now + 30 * dayMs)
                  : null,
          })),
        );
      }
    }

    // The engine's worst rules, one task per rule, tagged by rule so the
    // next audit does not open them again.
    const engineTasks = seomatorFindingsToTasks(engineFindings);
    if (engineTasks.length > 0) {
      const open = await db
        .select({ sourceRef: tasks.sourceRef })
        .from(tasks)
        .where(
          and(
            eq(tasks.clientId, clientId),
            like(tasks.sourceRef, "seomator:%"),
            inArray(tasks.status, ["todo", "in_progress"]),
          ),
        );
      const alreadyOpen = new Set(open.map((t) => t.sourceRef));
      const fresh = engineTasks.filter((t) => !alreadyOpen.has(t.type));
      const now = Date.now();
      const dayMs = 86_400_000;
      if (fresh.length > 0) {
        await db.insert(tasks).values(
          fresh.map((t) => ({
            clientId,
            title: t.title,
            description: t.description,
            whyItMatters: t.whyItMatters,
            priority: t.priority,
            toolPath: t.toolPath,
            status: "todo" as const,
            // The finding type is already `seomator:<rule id>`.
            sourceRef: t.type,
            dueDate:
              t.priority === "high"
                ? new Date(now + 7 * dayMs)
                : t.priority === "medium"
                  ? new Date(now + 30 * dayMs)
                  : null,
          })),
        );
      }
    }
  }

  if (geoFindings.length > 0) {
    await db.insert(auditIssues).values(
      geoFindings.map((f) => ({
        auditId: auditRow.id,
        type: `geo:${f.id}`,
        severity: f.severity as "critical" | "high" | "medium" | "low",
        url: f.pages[0] ?? client.url,
        message: f.title,
        category: "geo",
        fixSteps: f.remediation,
        confidence: "probably" as const,
        aiGenerated: false,
      })),
    );
  }

  const hasPreview =
    mode === "full" && existsSync(auditPreviewAbsolutePath(auditRow.id));
  const geoSummaryLine =
    geoResult != null
      ? `\n\n**GEO composite:** ${geoResult.composite}/100 (${Object.entries(
          geoResult.categoryScores,
        )
          .map(([k, v]) => `${k} ${v}`)
          .join(", ")})`
      : "";
  const issuesCount = realFindings.length + geoFindings.length;

  // With the engine, the score is its weighted category score (with caps);
  // without it, SEO Tool's own. Pages crawled stays the site crawl's count.
  await db
    .update(audits)
    .set({
      status: "completed",
      score: engine?.score ?? result.score,
      issuesCount,
      pagesCrawled: result.pagesCrawled,
      ...(engine && {
        summary: `${engine.summary}${geoSummaryLine}`.trim(),
        categoryScores: engine.categoryScores,
        rawReport: engine.raw as unknown as Record<string, unknown>,
      }),
      geoScore: geoResult?.composite ?? null,
      geoEnvelopeJson: geoResult?.envelope ?? null,
      previewScreenshotPath: hasPreview
        ? auditPreviewRelativePath(auditRow.id)
        : null,
      progressJson: {
        ...progressState,
        phase: "done",
        updatedAt: new Date().toISOString(),
      },
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(audits.id, auditRow.id));

  if (engine) {
    const normalized = normalizeSeomatorReport(engine.raw);
    if (normalized.history.length > 0) {
      await db.insert(auditRuleHistory).values(
        normalized.history.map((h) => ({
          clientId,
          auditId: auditRow.id,
          ruleId: h.ruleId,
          category: h.category,
          status: h.status,
          score: h.score,
        })),
      );
    }
  }

  // Build webhook notification (best effort)
  const score = engine?.score ?? result.score;
  const delta = previousScore !== null ? score - previousScore : null;
  const topIssue =
    realFindings.find((f) => f.severity === "critical")?.message ??
    realFindings.find((f) => f.severity === "high")?.message ??
    null;

  const isScoreDrop = delta !== null && delta <= -SCORE_DROP_THRESHOLD;
  const level: "success" | "warning" = isScoreDrop ? "warning" : "success";
  const titlePrefix = isScoreDrop
    ? "Score dropped"
    : delta !== null && delta > 0
      ? "Score improved"
      : "Audit completed";

  const fields: NotificationField[] = [
    { label: "Score", value: `${score}/100` },
    {
      label: "Issues",
      value: `${issuesCount} found`,
    },
  ];
  if (geoResult != null) {
    fields.push({ label: "GEO score", value: `${geoResult.composite}/100` });
  }
  if (delta !== null) {
    const sign = delta > 0 ? "+" : "";
    fields.push({
      label: "Vs last audit",
      value: `${sign}${delta}`,
    });
  }
  if (topIssue) {
    fields.push({ label: "Top issue", value: topIssue.slice(0, 200) });
  }

  notify({
    title: `${titlePrefix} — ${client.name}`,
    body: `Audit (${mode}) run on ${client.url}.`,
    level,
    fields,
  }).catch(() => {});

  await logActivity({
    kind: "audit.completed",
    message: `Audit #${auditRow.id} for ${client.name} (${mode}) — score ${score}/100, ${issuesCount} issues.`,
    level: isScoreDrop ? "warning" : "success",
    clientId,
    entityType: "audit",
    entityId: auditRow.id,
  });

  await runAutomations("audit_completed", {
    clientId,
    clientName: client.name,
    data: {
      auditId: auditRow.id,
      score,
      previousScore,
      issuesCount,
      geoScore: geoResult?.composite ?? null,
      topIssue: topIssue ?? "",
      mode,
    },
  });

  if (isScoreDrop) {
    await runAutomations("score_drop", {
      clientId,
      clientName: client.name,
      data: {
        auditId: auditRow.id,
        score,
        previousScore,
        delta,
        topIssue: topIssue ?? "",
      },
    });
  }

  // Refresh quick-wins from the new audit so the "Fix today" list stays
  // current. Best-effort — never block the redirect.
  try {
    const { applyQuickWins } = await import("@/lib/quick-wins");
    await applyQuickWins({ clientId });
  } catch {
    // ignore
  }

  safeRevalidatePath(`/clients/${clientId}`);
  safeRevalidatePath("/");
  redirect(`/audits/${auditRow.id}`);
}

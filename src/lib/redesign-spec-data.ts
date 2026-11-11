/**
 * Reads behind the redesign specification (redesign-spec.ts): the mission,
 * the project's latest full audit, its open findings, pages, category
 * scores and Core Web Vitals. Access is checked by the caller.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditIssues, audits, clients, missions } from "@/db/schema";
import { findingsToTasks } from "./audit-to-task";
import { withoutInfrastructure } from "./infrastructure-urls";
import { buildRedesignSpec, type RedesignSpec, type SpecSeverity } from "./redesign-spec";
import { ruleNamesFr } from "./rule-names.fr";
import { distinctProblemTypes } from "./task-dedupe";
import { extractCwv, ruleDisplayName } from "./seomator-meta";

export type SpecLabels = Record<string, { title: string; why: string | null }>;

export async function loadRedesignSpec(
  projectId: number,
  missionId: number,
  locale: "fr" | "en",
): Promise<{ spec: RedesignSpec; labels: SpecLabels } | null> {
  const [mission] = await db
    .select()
    .from(missions)
    .where(and(eq(missions.id, missionId), eq(missions.clientId, projectId)))
    .limit(1);
  if (!mission || mission.kind !== "redesign") return null;
  const [project] = await db
    .select({ name: clients.name, url: clients.url })
    .from(clients)
    .where(eq(clients.id, projectId))
    .limit(1);
  if (!project) return null;

  // The full audit is the basis; a quick one only when there is nothing else.
  const done = await db
    .select()
    .from(audits)
    .where(and(eq(audits.clientId, projectId), eq(audits.status, "completed"), eq(audits.kind, "crawler")))
    .orderBy(desc(audits.completedAt))
    .limit(20);
  const audit = done.find((a) => a.mode !== "quick") ?? done[0] ?? null;

  const allIssues = audit
    ? withoutInfrastructure(
        await db
          .select({ type: auditIssues.type, severity: auditIssues.severity, url: auditIssues.url, message: auditIssues.message })
          .from(auditIssues)
          .where(and(eq(auditIssues.auditId, audit.id), eq(auditIssues.status, "new"))),
      )
    : [];
  const wanted = distinctProblemTypes(allIssues.map((i) => i.type));
  const issues = allIssues.filter((i) => wanted.has(i.type));

  const raw = (audit?.rawReport ?? null) as {
    coverage?: { pages?: unknown };
    categoryResults?: { categoryId?: unknown; score?: unknown }[];
  } | null;
  const pages = Array.isArray(raw?.coverage?.pages)
    ? (raw.coverage.pages as unknown[]).filter((p): p is string => typeof p === "string")
    : [];
  const categories = Array.isArray(raw?.categoryResults)
    ? raw.categoryResults
        .filter((c) => typeof c.categoryId === "string" && typeof c.score === "number")
        .map((c) => ({ id: c.categoryId as string, score: c.score as number }))
    : [];
  const cwv = extractCwv(raw as Record<string, unknown> | null);

  const spec = buildRedesignSpec({
    project,
    mission: { title: mission.title, targetStack: mission.targetStack, notes: mission.notes },
    audit: audit
      ? {
          id: audit.id,
          at: audit.completedAt ?? audit.createdAt,
          mode: audit.mode,
          score: audit.score,
          pagesCrawled: audit.pagesCrawled,
        }
      : null,
    categories,
    // Pages the findings name count too: an older audit has no coverage list.
    pages: [...pages, ...issues.map((i) => i.url)],
    cwv: cwv ? { lcp: cwv.lcp, cls: cwv.cls, inp: cwv.inp } : null,
    issues: issues.map((i) => ({ type: i.type, severity: i.severity as SpecSeverity, url: i.url })),
  });

  // What to do about each problem, in the workspace language: the audit's
  // own task wording for its checks, the rule name for the engine's.
  const labels: SpecLabels = {};
  for (const m of spec.mustFix) {
    const list = issues.filter((i) => i.type === m.type);
    if (m.type.startsWith("seomator:")) {
      const id = m.type.slice("seomator:".length);
      labels[m.type] = {
        title: (locale === "fr" ? ruleNamesFr[id] : undefined) ?? ruleDisplayName(id),
        // The engine's messages exist in English only.
        why: locale === "fr" ? null : (list[0]?.message ?? null),
      };
    } else {
      const [task] = findingsToTasks(
        list.map((i) => ({ type: i.type, severity: i.severity as SpecSeverity, message: i.message, url: i.url })),
        locale,
      );
      labels[m.type] = { title: task?.title ?? m.type, why: task?.whyItMatters ?? null };
    }
  }
  return { spec, labels };
}

/**
 * The finished document in the interface language, or null when the
 * mission is not a redesign of this project. Used by the page and by the
 * Markdown export.
 */
export async function loadSpecDocument(projectId: number, missionId: number) {
  const { getLocale, getTranslations } = await import("next-intl/server");
  const { specDocument } = await import("./redesign-spec-document");
  const locale = (await getLocale()) === "fr" ? "fr" : "en";
  const loaded = await loadRedesignSpec(projectId, missionId, locale);
  if (!loaded) return null;
  const t = await getTranslations({ locale, namespace: "redesignSpec" });
  const tCat = await getTranslations({ locale, namespace: "auditUi.categories" });
  const { categoryLabel } = await import("./seomator-meta");
  for (const c of loaded.spec.weakCategories) {
    loaded.labels[`category:${c.id}`] = { title: tCat.has(c.id) ? tCat(c.id) : categoryLabel(c.id), why: null };
  }
  return specDocument(
    loaded.spec,
    loaded.labels,
    (key, values) => t(key as never, values as never),
    locale,
  );
}

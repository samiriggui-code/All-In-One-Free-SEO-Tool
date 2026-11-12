/**
 * What the app already knows about a client, turned into knowledge base
 * documents: the client's profile and context, the latest audits, the
 * articles and the briefs. Run by the scheduler every hour and by the
 * "Update" button; a source whose text has not changed costs one hash.
 *
 * Each builder returns plain text with Markdown headings, so the chunker
 * cuts on sections and search shows which section a passage sits in.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditIssues, audits, clientContext, clients, contentBriefs, contentPosts } from "@/db/schema";
import { pruneSynced, upsertDocument, type KbSourceType } from "./store";

const AUDITS_KEPT = 3;
const ISSUE_EXAMPLES = 5;

export type SyncReport = { documents: number; changed: number; removed: number; embedded?: number; embedError?: string };

function lines(...parts: (string | null | undefined | false)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0).join("\n\n");
}

async function profileDocument(clientId: number): Promise<{ title: string; text: string; url: string } | null> {
  const [c] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!c) return null;
  const [ctx] = await db.select().from(clientContext).where(eq(clientContext.clientId, clientId)).limit(1);
  const text = lines(
    `# ${c.name}`,
    `Site : ${c.url}`,
    c.niche ? `Secteur : ${c.niche}` : null,
    c.description,
    ctx?.selfDescription ? `## Ce que le site dit de lui\n\n${ctx.selfDescription}` : null,
    ctx?.businessOverview ? `## Activité\n\n${ctx.businessOverview}` : null,
    ctx?.audience ? `## Public\n\n${ctx.audience}` : null,
    ctx?.products?.length ? `## Produits et services\n\n${ctx.products.map((p) => `- ${p.term}`).join("\n")}` : null,
    ctx?.keyPages?.length
      ? `## Pages clés\n\n${ctx.keyPages.map((p) => `- ${p.url}${p.why ? ` : ${p.why}` : ""}`).join("\n")}`
      : null,
    ctx?.notes ? `## Notes\n\n${ctx.notes}` : null,
  );
  return { title: `Fiche client : ${c.name}`, text, url: c.url };
}

async function auditDocuments(clientId: number) {
  const recent = await db
    .select({ id: audits.id, score: audits.score, completedAt: audits.completedAt, pages: audits.pagesCrawled, kind: audits.kind })
    .from(audits)
    .where(and(eq(audits.clientId, clientId), eq(audits.status, "completed")))
    .orderBy(desc(audits.completedAt), desc(audits.id))
    .limit(AUDITS_KEPT);
  if (recent.length === 0) return [];
  const issues = await db
    .select({ auditId: auditIssues.auditId, severity: auditIssues.severity, type: auditIssues.type, url: auditIssues.url, message: auditIssues.message, status: auditIssues.status })
    .from(auditIssues)
    .where(inArray(auditIssues.auditId, recent.map((a) => a.id)));

  return recent.map((a) => {
    const mine = issues.filter((i) => i.auditId === a.id && i.status !== "false_positive");
    const byType = new Map<string, typeof mine>();
    for (const i of mine) byType.set(i.type, [...(byType.get(i.type) ?? []), i]);
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    const groups = Array.from(byType.entries()).sort(
      (x, y) => order[x[1][0].severity] - order[y[1][0].severity] || y[1].length - x[1].length,
    );
    const day = a.completedAt ? a.completedAt.toISOString().slice(0, 10) : "date inconnue";
    const text = lines(
      `# Audit du ${day}`,
      `Score : ${a.score ?? "—"}/100. Pages explorées : ${a.pages ?? "—"}. Problèmes : ${mine.length}.`,
      ...groups.map(([type, list]) =>
        lines(
          `## ${type} (${list[0].severity}, ${list.length} page${list.length > 1 ? "s" : ""})`,
          list[0].message,
          list
            .slice(0, ISSUE_EXAMPLES)
            .map((i) => `- ${i.url}${i.status === "resolved" ? " (corrigé)" : ""}`)
            .join("\n"),
        ),
      ),
    );
    return { sourceId: String(a.id), title: `Audit du ${day} (score ${a.score ?? "—"})`, text, url: null };
  });
}

async function postDocuments(clientId: number) {
  const rows = await db.select().from(contentPosts).where(eq(contentPosts.clientId, clientId));
  return rows
    .filter((p) => p.draftMarkdown || p.title)
    .map((p) => ({
      sourceId: String(p.id),
      title: `Article : ${p.title ?? p.primaryKeyword ?? `#${p.id}`}`,
      url: p.publishedUrl,
      text: lines(
        `# ${p.title ?? p.primaryKeyword ?? ""}`,
        p.primaryKeyword ? `Mot-clé principal : ${p.primaryKeyword}. Statut : ${p.status}.` : `Statut : ${p.status}.`,
        p.metaDescription ? `Méta-description : ${p.metaDescription}` : null,
        p.draftMarkdown,
      ),
    }));
}

async function briefDocuments(clientId: number) {
  const rows = await db.select().from(contentBriefs).where(eq(contentBriefs.clientId, clientId));
  return rows.map((b) => ({
    sourceId: String(b.id),
    title: `Brief : ${b.title}`,
    url: b.publishedUrl,
    text: lines(
      `# ${b.title}`,
      `Mot-clé cible : ${b.targetKeyword}. Statut : ${b.status}.${b.targetWordCount ? ` Longueur visée : ${b.targetWordCount} mots.` : ""}`,
      b.outline?.length ? `## Plan\n\n${b.outline.map((h) => `${"  ".repeat(Math.max(0, h.level - 2))}- ${h.heading}`).join("\n")}` : null,
      b.paaQuestions?.length ? `## Questions des internautes\n\n${b.paaQuestions.map((q) => `- ${q}`).join("\n")}` : null,
      b.notes ? `## Notes\n\n${b.notes}` : null,
    ),
  }));
}

/** Bring one client's synced documents up to date. Manual documents are never touched. */
export async function syncClientKnowledge(clientId: number): Promise<SyncReport> {
  const report: SyncReport = { documents: 0, changed: 0, removed: 0 };
  const apply = async (type: KbSourceType, docs: { sourceId: string; title: string; text: string; url: string | null }[]) => {
    const keep = new Set<string>();
    for (const d of docs) {
      if (!d.text.trim()) continue;
      keep.add(d.sourceId);
      const r = await upsertDocument({ clientId, sourceType: type, ...d });
      report.documents++;
      if (r.changed) report.changed++;
    }
    report.removed += await pruneSynced(clientId, type, keep);
  };

  const profile = await profileDocument(clientId);
  if (!profile) return report;
  await apply("profile", [{ sourceId: "profile", ...profile }]);
  await apply("audit", await auditDocuments(clientId));
  await apply("post", await postDocuments(clientId));
  await apply("brief", await briefDocuments(clientId));
  const { embedPendingChunks } = await import("./vectors");
  const e = await embedPendingChunks({ clientId }).catch((err: Error) => ({ embedded: 0, error: err.message }));
  report.embedded = e.embedded;
  if (e.error) report.embedError = e.error;
  return report;
}

/** Scheduler entry: every client, one after the other. */
export async function syncAllKnowledge(): Promise<SyncReport> {
  const all = await db.select({ id: clients.id }).from(clients);
  const total: SyncReport = { documents: 0, changed: 0, removed: 0 };
  for (const c of all) {
    try {
      const r = await syncClientKnowledge(c.id);
      total.documents += r.documents;
      total.changed += r.changed;
      total.removed += r.removed;
    } catch {
      // One client's bad row must not stop the others.
    }
  }
  return total;
}

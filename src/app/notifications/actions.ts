"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import {
  activityLog,
  audits,
  clients,
  monitoredPages,
  pageChanges,
} from "@/db/schema";
import { currentUser, visibleClientIds } from "@/lib/auth";

export type Notification = {
  id: string; // composite to support multiple sources
  kind:
    | "audit_complete"
    | "audit_failed"
    | "page_change"
    | "score_drop"
    | "update_available"
    | "update_applied";
  level: "success" | "warning" | "error" | "info";
  title: string;
  body: string;
  href: string;
  at: Date;
};

export async function recentNotifications(): Promise<Notification[]> {
  await requireSignedIn();
  const t = await getTranslations("serverMessages.notifications");
  const out: Notification[] = [];
  // A member only hears about the clients they're assigned to; null
  // means they see every client.
  const scope = await visibleClientIds(await currentUser());

  // Audits — last 8 across the clients the caller can see
  const recentAudits = scope?.length === 0 ? [] : await db
    .select({
      id: audits.id,
      score: audits.score,
      issuesCount: audits.issuesCount,
      status: audits.status,
      completedAt: audits.completedAt,
      createdAt: audits.createdAt,
      clientId: audits.clientId,
      clientName: clients.name,
    })
    .from(audits)
    .leftJoin(clients, eq(audits.clientId, clients.id))
    .where(scope ? inArray(audits.clientId, scope) : undefined)
    .orderBy(desc(audits.createdAt))
    .limit(8);

  // Compute per-client "previous completed" to detect drops
  const prevByClient = new Map<number, number>(); // clientId -> previous score
  for (const a of [...recentAudits].reverse()) {
    if (a.status !== "completed" || a.score === null) continue;
    const prev = prevByClient.get(a.clientId);
    if (prev !== undefined && a.score - prev <= -5) {
      out.push({
        id: `score:${a.id}`,
        kind: "score_drop",
        level: "warning",
        title: t("scoreDropped", { client: a.clientName ?? t("client") }),
        body: t("scoreDroppedBody", { prev, score: a.score, diff: prev - a.score }),
        href: `/audits/${a.id}`,
        at: a.completedAt ?? a.createdAt,
      });
    }
    prevByClient.set(a.clientId, a.score);
  }

  for (const a of recentAudits) {
    if (a.status === "failed") {
      out.push({
        id: `audit:${a.id}`,
        kind: "audit_failed",
        level: "error",
        title: t("auditFailed", { client: a.clientName ?? t("client") }),
        body: t("auditFailedBody"),
        href: `/audits/${a.id}`,
        at: a.completedAt ?? a.createdAt,
      });
    } else if (a.status === "completed") {
      out.push({
        id: `audit:${a.id}`,
        kind: "audit_complete",
        level: "success",
        title: t("auditComplete", { client: a.clientName ?? t("client") }),
        body: t("auditCompleteBody", { score: a.score ?? "—", count: a.issuesCount }),
        href: `/audits/${a.id}`,
        at: a.completedAt ?? a.createdAt,
      });
    }
  }

  // Page changes — last 10 (skip pure content-hash diffs to reduce noise)
  const changes = scope?.length === 0 ? [] : await db
    .select({
      id: pageChanges.id,
      field: pageChanges.field,
      oldValue: pageChanges.oldValue,
      newValue: pageChanges.newValue,
      detectedAt: pageChanges.detectedAt,
      pageUrl: monitoredPages.url,
      pageLabel: monitoredPages.label,
      clientId: monitoredPages.clientId,
      clientName: clients.name,
    })
    .from(pageChanges)
    .leftJoin(
      monitoredPages,
      eq(pageChanges.monitoredPageId, monitoredPages.id),
    )
    .leftJoin(clients, eq(monitoredPages.clientId, clients.id))
    .where(scope ? inArray(monitoredPages.clientId, scope) : undefined)
    .orderBy(desc(pageChanges.detectedAt))
    .limit(10);

  for (const c of changes) {
    if (c.field === "content") continue;
    out.push({
      id: `change:${c.id}`,
      kind: "page_change",
      level: "warning",
      title: t("fieldChanged", { field: c.field, client: c.clientName ?? t("client") }),
      body: `${c.pageLabel ?? c.pageUrl?.replace(/^https?:\/\//, "") ?? ""} · "${(c.oldValue ?? "—").slice(0, 60)}" → "${(c.newValue ?? "—").slice(0, 60)}"`,
      href: "/monitor",
      at: c.detectedAt,
    });
  }

  // System events from activity log. Surfaces:
  //   - the SINGLE most-recent "update available" notification, but
  //     ONLY if it's newer than the most-recent "updated" — otherwise
  //     it's stale (user already applied that update or one past it).
  //   - the SINGLE most-recent "updated" event (success toast).
  // logActivity dedupes by (kind, message) within 24h, so the same
  // commit SHA only ever creates one row of each kind.
  const [lastAvail] = await db
    .select({
      id: activityLog.id,
      message: activityLog.message,
      at: activityLog.createdAt,
    })
    .from(activityLog)
    .where(eq(activityLog.kind, "system.update_available"))
    .orderBy(desc(activityLog.createdAt))
    .limit(1);

  const [lastUpdated] = await db
    .select({
      id: activityLog.id,
      message: activityLog.message,
      level: activityLog.level,
      at: activityLog.createdAt,
    })
    .from(activityLog)
    .where(eq(activityLog.kind, "system.updated"))
    .orderBy(desc(activityLog.createdAt))
    .limit(1);

  // Hide "update available" if the user already applied something newer.
  if (
    lastAvail &&
    (!lastUpdated || lastAvail.at.getTime() > lastUpdated.at.getTime())
  ) {
    out.push({
      id: `sys:avail:${lastAvail.id}`,
      kind: "update_available",
      level: "info",
      title: t("updateAvailable"),
      body: lastAvail.message,
      href: "/settings#update",
      at: lastAvail.at,
    });
  }

  // Show "App updated" only when it's recent (last 24h) so it doesn't
  // linger forever after a successful update.
  if (
    lastUpdated &&
    Date.now() - lastUpdated.at.getTime() < 24 * 60 * 60 * 1000
  ) {
    out.push({
      id: `sys:upd:${lastUpdated.id}`,
      kind: "update_applied",
      level: (lastUpdated.level ?? "success") as Notification["level"],
      title: t("appUpdated"),
      body: lastUpdated.message,
      href: "/settings#update",
      at: lastUpdated.at,
    });
  }

  // Sort newest first, cap to 15
  out.sort((a, b) => b.at.getTime() - a.at.getTime());
  return out.slice(0, 15);
}

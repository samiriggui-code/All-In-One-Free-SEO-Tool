/**
 * Unread / "what's new" badges. Tracks the last time the user opened
 * each section and counts items that have arrived since.
 *
 * Design: very lightweight. We persist `seen.<key>.last_seen_at` in
 * workspace_settings. Each call returns the count of items newer than
 * that timestamp. Caller renders the badge.
 */

import { and, count, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  aiSuggestions,
  newsItems,
  pageChanges,
  activityLog,
  monitoredPages,
} from "@/db/schema";
import { getSetting, setSetting } from "./settings-store";

type UnreadKey =
  | "seen.news.last_seen_at"
  | "seen.suggestions.last_seen_at"
  | "seen.page_changes.last_seen_at"
  | "seen.activity.last_seen_at";

export type UnreadCounts = {
  news: number;
  suggestions: number;
  pageChanges: number;
  total: number;
};

/**
 * `scope` is the caller's visible client ids (null = every client), so a
 * member's page-change badge only counts their own clients' pages.
 */
export async function getUnreadCounts(
  scope: number[] | null = null,
): Promise<UnreadCounts> {
  const [newsAt, sugAt, pageAt] = await Promise.all([
    getSetting<number>("seen.news.last_seen_at"),
    getSetting<number>("seen.suggestions.last_seen_at"),
    getSetting<number>("seen.page_changes.last_seen_at"),
  ]);

  const newsCutoff = new Date(newsAt ?? 0);
  const sugCutoff = new Date(sugAt ?? 0);
  const pageCutoff = new Date(pageAt ?? 0);

  const [[newsRow], [sugRow], [pageRow]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(newsItems)
        .where(gt(newsItems.capturedAt, newsCutoff)),
      db
        .select({ value: count() })
        .from(aiSuggestions)
        .where(gt(aiSuggestions.createdAt, sugCutoff)),
      scope?.length === 0
        ? [{ value: 0 }]
        : db
            .select({ value: count() })
            .from(pageChanges)
            .innerJoin(
              monitoredPages,
              eq(pageChanges.monitoredPageId, monitoredPages.id),
            )
            .where(
              and(
                gt(pageChanges.detectedAt, pageCutoff),
                scope ? inArray(monitoredPages.clientId, scope) : undefined,
              ),
            ),
    ]);

  const news = Number(newsRow?.value ?? 0);
  const suggestions = Number(sugRow?.value ?? 0);
  const pageChangesCount = Number(pageRow?.value ?? 0);
  return {
    news,
    suggestions,
    pageChanges: pageChangesCount,
    total: news + suggestions + pageChangesCount,
  };
}

const KEY_FOR_SECTION: Record<string, UnreadKey> = {
  news: "seen.news.last_seen_at",
  suggestions: "seen.suggestions.last_seen_at",
  page_changes: "seen.page_changes.last_seen_at",
  activity: "seen.activity.last_seen_at",
};

/** Mark a section as seen — wipes its badge until new items arrive. */
export async function markSectionSeen(
  section: keyof typeof KEY_FOR_SECTION,
): Promise<void> {
  const key = KEY_FOR_SECTION[section];
  if (!key) return;
  await setSetting(key, Date.now());
}

/**
 * Recent activity-log items the user hasn't seen — feeds the bell-icon
 * dropdown. Capped to last 20 entries.
 */
export async function getRecentActivity(): Promise<
  { id: number; kind: string; message: string; at: Date; level: string }[]
> {
  const seenAt = await getSetting<number>("seen.activity.last_seen_at");
  const cutoff = new Date(seenAt ?? 0);
  const rows = await db
    .select({
      id: activityLog.id,
      kind: activityLog.kind,
      message: activityLog.message,
      at: activityLog.createdAt,
      level: activityLog.level,
    })
    .from(activityLog)
    .where(gt(activityLog.createdAt, cutoff))
    .orderBy(activityLog.createdAt)
    .limit(20);
  return rows;
}

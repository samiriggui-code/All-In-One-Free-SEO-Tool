import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, contentKeywordResearch, contentPosts } from "@/db/schema";
import type { StyleProfile } from "./seo/writer";
import type { ResearchResult } from "./seo/research";

/**
 * Persistence for the content studio. Every read and write is scoped to
 * a client id, so a post id from one client can never be used to read
 * or change another client's article.
 */

export type ContentPost = typeof contentPosts.$inferSelect;
export type NewContentPost = Omit<typeof contentPosts.$inferInsert, "id" | "clientId" | "createdAt" | "updatedAt">;
export type ContentPostPatch = Partial<NewContentPost>;

export async function listPosts(clientId: number): Promise<ContentPost[]> {
  return db
    .select()
    .from(contentPosts)
    .where(eq(contentPosts.clientId, clientId))
    .orderBy(desc(contentPosts.updatedAt), desc(contentPosts.id));
}

export async function getPost(clientId: number, postId: number): Promise<ContentPost | null> {
  const [row] = await db
    .select()
    .from(contentPosts)
    .where(and(eq(contentPosts.clientId, clientId), eq(contentPosts.id, postId)))
    .limit(1);
  return row ?? null;
}

export async function createPost(clientId: number, values: NewContentPost): Promise<ContentPost> {
  const [row] = await db
    .insert(contentPosts)
    .values({ ...values, clientId })
    .returning();
  return row;
}

export async function updatePost(
  clientId: number,
  postId: number,
  patch: ContentPostPatch,
): Promise<ContentPost | null> {
  const [row] = await db
    .update(contentPosts)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(contentPosts.clientId, clientId), eq(contentPosts.id, postId)))
    .returning();
  return row ?? null;
}

export async function deletePost(clientId: number, postId: number): Promise<boolean> {
  const rows = await db
    .delete(contentPosts)
    .where(and(eq(contentPosts.clientId, clientId), eq(contentPosts.id, postId)))
    .returning({ id: contentPosts.id });
  return rows.length > 0;
}

export async function saveKeywordResearch(
  clientId: number,
  language: string,
  result: ResearchResult,
): Promise<number> {
  const [row] = await db
    .insert(contentKeywordResearch)
    .values({
      clientId,
      seed: result.seed,
      language,
      suggested: result.suggested,
      serp: result.serpTop10,
      paa: result.paa,
    })
    .returning({ id: contentKeywordResearch.id });
  return row.id;
}

export async function listKeywordResearch(clientId: number, limit = 20) {
  return db
    .select()
    .from(contentKeywordResearch)
    .where(eq(contentKeywordResearch.clientId, clientId))
    .orderBy(desc(contentKeywordResearch.createdAt), desc(contentKeywordResearch.id))
    .limit(limit);
}

export async function getStyleProfile(clientId: number): Promise<StyleProfile | null> {
  const [row] = await db
    .select({ profile: clients.contentStyleProfile })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return row?.profile ?? null;
}

export async function setStyleProfile(clientId: number, profile: StyleProfile | null): Promise<void> {
  await db
    .update(clients)
    .set({ contentStyleProfile: profile, updatedAt: new Date() })
    .where(eq(clients.id, clientId));
}

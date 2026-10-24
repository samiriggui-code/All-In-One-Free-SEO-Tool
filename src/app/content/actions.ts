"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { canEdit, canSeeClient, currentUser } from "@/lib/auth";
import {
  createPost,
  deletePost,
  getPost,
  getStyleProfile,
  saveKeywordResearch,
  updatePost,
} from "@/lib/content-studio/store";
import { classifyIntentByRules } from "@/lib/content-studio/seo/intent";
import { generateOutline } from "@/lib/content-studio/seo/outline";
import { writePost } from "@/lib/content-studio/seo/writer";
import { generateMeta } from "@/lib/content-studio/seo/meta";
import { research } from "@/lib/content-studio/seo/research";
import { scoreDraft, type ContentScoreReport } from "@/lib/content-studio/seo/content-score";
import { cachedCorpus, loadCorpus } from "@/lib/content-studio/corpus-cache";
import { outlineToText, textToOutline } from "@/lib/content-studio/outline-text";
import type { KeywordSuggestion, Outline } from "@/lib/content-studio/types";

/**
 * Server actions behind the writing studio (/content).
 *
 * Errors come back as codes, not sentences: the pages are translated and
 * the action does not know the reader's language. Each code has a string
 * under `content.errors` in both message files.
 *
 * @ai-partial — keyword ideas and the top-10 score never touch a model;
 * without a key the outline and article come back as skeletons.
 */
export type ContentError = "readOnly" | "notFound" | "invalid" | "noOutline" | "failed";
type Fail = { ok: false; error: ContentError };

const ids = z.object({
  clientId: z.coerce.number().int().positive(),
  postId: z.coerce.number().int().positive(),
});

/** Can the current user change this client's articles? */
async function guard(clientId: number): Promise<ContentError | null> {
  const me = await currentUser();
  if (me && !canEdit(me.role)) return "readOnly";
  if (!(await canSeeClient(me, clientId))) return "notFound";
  return null;
}

async function clientInfo(clientId: number) {
  const [row] = await db
    .select({ name: clients.name, url: clients.url, language: clients.language })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return row ? { ...row, language: row.language || "en" } : null;
}

const postPath = (clientId: number, postId: number) => `/content/c/${clientId}/p/${postId}`;

// ---------------------------------------------------------------------------
// Keyword ideas and new articles
// ---------------------------------------------------------------------------

export type ResearchState =
  | { ok: true; seed: string; suggested: KeywordSuggestion[]; paa: string[] }
  | Fail;

export async function researchKeywords(input: { clientId: number; seed: string }): Promise<ResearchState> {
  const parsed = z
    .object({ clientId: z.coerce.number().int().positive(), seed: z.string().trim().min(2).max(120) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, seed } = parsed.data;
  const denied = await guard(clientId);
  if (denied) return { ok: false, error: denied };
  const client = await clientInfo(clientId);
  if (!client) return { ok: false, error: "notFound" };

  try {
    const result = await research(seed, client.language);
    await saveKeywordResearch(clientId, client.language, result);
    return { ok: true, seed, suggested: result.suggested, paa: result.paa };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export type CreateState = Fail | null;

export async function createArticle(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const parsed = z
    .object({
      clientId: z.coerce.number().int().positive(),
      keyword: z.string().trim().min(2).max(120),
      title: z.string().trim().max(200).optional(),
    })
    .safeParse({
      clientId: formData.get("clientId"),
      keyword: formData.get("keyword"),
      title: formData.get("title") || undefined,
    });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, keyword, title } = parsed.data;
  const denied = await guard(clientId);
  if (denied) return { ok: false, error: denied };

  const post = await createPost(clientId, {
    status: "idea",
    title: title || keyword,
    primaryKeyword: keyword,
    intent: classifyIntentByRules(keyword).intent,
  });
  revalidatePath(`/content/c/${clientId}`);
  redirect(postPath(clientId, post.id));
}

export async function deleteArticle(input: { clientId: number; postId: number }): Promise<Fail | null> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, postId } = parsed.data;
  const denied = await guard(clientId);
  if (denied) return { ok: false, error: denied };
  await deletePost(clientId, postId);
  revalidatePath(`/content/c/${clientId}`);
  redirect(`/content/c/${clientId}`);
}

// ---------------------------------------------------------------------------
// Outline
// ---------------------------------------------------------------------------

export type OutlineState = { ok: true; outlineText: string; approved: boolean } | Fail;

export async function generateArticleOutline(input: { clientId: number; postId: number }): Promise<OutlineState> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, postId } = parsed.data;
  const denied = await guard(clientId);
  if (denied) return { ok: false, error: denied };
  const [post, client, style] = await Promise.all([
    getPost(clientId, postId),
    clientInfo(clientId),
    getStyleProfile(clientId),
  ]);
  if (!post || !client) return { ok: false, error: "notFound" };

  const keyword = post.primaryKeyword ?? post.title ?? "";
  const intent = classifyIntentByRules(keyword);
  try {
    const outline = await generateOutline({
      title: post.title ?? keyword,
      primary_keyword: keyword,
      intent: post.intent ?? intent.intent,
      format: intent.recommended_format,
      client_style_profile: style ?? undefined,
      language: client.language,
    });
    // A new outline means the old approval no longer applies.
    await updatePost(clientId, postId, {
      outline,
      status: post.status === "outline_approved" ? "idea" : post.status,
    });
    revalidatePath(postPath(clientId, postId));
    return { ok: true, outlineText: outlineToText(outline), approved: false };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function saveArticleOutline(input: {
  clientId: number;
  postId: number;
  text: string;
  approve: boolean;
}): Promise<OutlineState> {
  const parsed = ids
    .extend({ text: z.string().max(20_000), approve: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, postId, text, approve } = parsed.data;
  const denied = await guard(clientId);
  if (denied) return { ok: false, error: denied };
  const post = await getPost(clientId, postId);
  if (!post) return { ok: false, error: "notFound" };

  const base: Outline = post.outline ?? emptyOutline(post.title ?? post.primaryKeyword ?? "");
  const outline = textToOutline(text, base);
  if (outline.h2s.length === 0) return { ok: false, error: "noOutline" };

  // Approving only moves an article forward: a draft stays a draft.
  const status = approve && post.status === "idea" ? "outline_approved" : post.status;
  await updatePost(clientId, postId, { outline, status });
  revalidatePath(postPath(clientId, postId));
  return { ok: true, outlineText: outlineToText(outline), approved: status !== "idea" };
}

function emptyOutline(title: string): Outline {
  return {
    title,
    slug: "",
    tldr_bullets: [],
    intro_hook: "",
    h2s: [],
    faqs: [],
    conclusion_cta: "",
    internal_link_topics: [],
    image_suggestions: [],
    word_count_target: 1500,
  };
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

export type DraftState =
  | { ok: true; draftMarkdown: string; metaTitle: string; metaDescription: string }
  | Fail;

export async function writeArticleDraft(input: { clientId: number; postId: number }): Promise<DraftState> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, postId } = parsed.data;
  const denied = await guard(clientId);
  if (denied) return { ok: false, error: denied };
  const [post, client, style] = await Promise.all([
    getPost(clientId, postId),
    clientInfo(clientId),
    getStyleProfile(clientId),
  ]);
  if (!post || !client) return { ok: false, error: "notFound" };
  if (!post.outline || post.outline.h2s.length === 0) return { ok: false, error: "noOutline" };

  const keyword = post.primaryKeyword ?? post.title ?? "";
  try {
    const draftMarkdown = await writePost({
      outline: post.outline,
      primary_keyword: keyword,
      style: style ?? { language: client.language },
      language: client.language,
    });
    const meta = await generateMeta({
      title: post.title ?? post.outline.title ?? keyword,
      primary_keyword: keyword,
      intent: post.intent ?? classifyIntentByRules(keyword).intent,
      intro: draftMarkdown.slice(0, 800),
      brand: client.name,
      language: client.language,
    });
    await updatePost(clientId, postId, {
      draftMarkdown,
      metaTitle: meta.metaTitle,
      metaDescription: meta.metaDescription,
      status: post.status === "idea" || post.status === "outline_approved" ? "draft" : post.status,
    });
    revalidatePath(postPath(clientId, postId));
    return { ok: true, draftMarkdown, metaTitle: meta.metaTitle, metaDescription: meta.metaDescription };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function saveArticleDraft(input: {
  clientId: number;
  postId: number;
  title: string;
  draftMarkdown: string;
  metaTitle: string;
  metaDescription: string;
}): Promise<{ ok: true; savedAt: number } | Fail> {
  const parsed = ids
    .extend({
      title: z.string().trim().max(200),
      draftMarkdown: z.string().max(200_000),
      metaTitle: z.string().trim().max(200),
      metaDescription: z.string().trim().max(400),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, postId, ...fields } = parsed.data;
  const denied = await guard(clientId);
  if (denied) return { ok: false, error: denied };
  const row = await updatePost(clientId, postId, {
    title: fields.title || null,
    draftMarkdown: fields.draftMarkdown,
    metaTitle: fields.metaTitle || null,
    metaDescription: fields.metaDescription || null,
  });
  if (!row) return { ok: false, error: "notFound" };
  revalidatePath(`/content/c/${clientId}`);
  return { ok: true, savedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------

export type ScoreState =
  | { ok: true; report: ContentScoreReport | null }
  | Fail;

/**
 * Score a draft against the top 10 for its keyword.
 *
 * `fetch: false` is the live path the editor calls while someone types:
 * it scores only when the corpus is already cached and otherwise answers
 * `report: null`, so a keystroke never starts a 20-second download. The
 * explicit "analyse" button passes `fetch: true`.
 */
export async function scoreArticle(input: {
  clientId: number;
  postId: number;
  markdown: string;
  fetch: boolean;
  refresh?: boolean;
}): Promise<ScoreState> {
  const parsed = ids
    .extend({ markdown: z.string().max(200_000), fetch: z.boolean(), refresh: z.boolean().optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { clientId, postId, markdown } = parsed.data;
  const me = await currentUser();
  if (!(await canSeeClient(me, clientId))) return { ok: false, error: "notFound" };
  const [post, client] = await Promise.all([getPost(clientId, postId), clientInfo(clientId)]);
  if (!post || !client) return { ok: false, error: "notFound" };
  const keyword = post.primaryKeyword ?? post.title ?? "";
  if (!keyword) return { ok: false, error: "invalid" };

  try {
    const ctx = parsed.data.fetch
      ? await loadCorpus(keyword, client.language, parsed.data.refresh)
      : cachedCorpus(keyword, client.language);
    if (!ctx) return { ok: true, report: null };
    const headings = markdown
      .split(/\r?\n/)
      .filter((l) => /^#{1,4}\s/.test(l))
      .map((l) => l.replace(/^#+\s+/, "").trim());
    const report = scoreDraft(markdown, headings, ctx);
    // Only an editor's score is kept: a viewer looking at the page should
    // not change what the article list shows.
    if (
      !report.insufficient_data &&
      report.score !== post.contentScore &&
      (!me || canEdit(me.role))
    ) {
      await updatePost(clientId, postId, { contentScore: report.score });
    }
    return { ok: true, report };
  } catch {
    return { ok: false, error: "failed" };
  }
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { kbDocuments } from "@/db/schema";
import { requireSignedIn } from "@/lib/action-guard";
import { actionTx } from "@/lib/action-tx";
import { requireClientAccess } from "@/lib/auth";
import { syncClientKnowledge, type SyncReport } from "@/lib/kb/sources";
import { deleteDocument, searchKnowledge, upsertDocument, type KbHit } from "@/lib/kb/store";
import { parseHtmlToMarkdown } from "@/lib/main-content-extractor";
import { guardedFetch } from "@/lib/url-guard";

/**
 * A client's knowledge base: search it, refresh it, add a note or a web
 * page, remove what was added by hand. Every action checks the caller
 * may see the client (and change it, for writes): a member only reaches
 * the clients they are assigned to.
 */

export type KbResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const MAX_NOTE_CHARS = 50_000;
const MAX_PAGE_BYTES = 3_000_000;

const page = (clientId: number) => `/knowledge/c/${clientId}`;

export async function searchClientKnowledge(clientId: number, query: string): Promise<KbResult<KbHit[]>> {
  await requireSignedIn();
  await requireClientAccess(Number(clientId));
  return { ok: true, data: await searchKnowledge(Number(clientId), String(query ?? "").slice(0, 500), 8) };
}

export async function syncKnowledgeNow(clientId: number): Promise<KbResult<SyncReport>> {
  await requireSignedIn();
  await requireClientAccess(Number(clientId), { edit: true });
  const report = await syncClientKnowledge(Number(clientId));
  revalidatePath(page(clientId));
  return { ok: true, data: report };
}

export async function addKnowledgeNote(
  clientId: number,
  input: { title: string; text: string },
): Promise<KbResult> {
  await requireSignedIn();
  const me = await requireClientAccess(Number(clientId), { edit: true });
  const tx = await actionTx("knowledge");
  const title = String(input?.title ?? "").trim().slice(0, 200);
  const text = String(input?.text ?? "").trim();
  if (!text) return { ok: false, error: tx("errors.emptyNote") };
  if (text.length > MAX_NOTE_CHARS) return { ok: false, error: tx("errors.noteTooLong", { max: MAX_NOTE_CHARS }) };
  await upsertDocument({
    clientId: Number(clientId),
    sourceType: "note",
    sourceId: randomUUID(),
    title: title || text.split("\n")[0].slice(0, 80),
    text,
    manual: true,
    createdBy: me?.id ?? null,
  });
  revalidatePath(page(clientId));
  return { ok: true, data: undefined };
}

export async function addKnowledgeUrl(clientId: number, rawUrl: string): Promise<KbResult> {
  await requireSignedIn();
  const me = await requireClientAccess(Number(clientId), { edit: true });
  const tx = await actionTx("knowledge");
  let url: URL;
  try {
    url = new URL(String(rawUrl ?? "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    return { ok: false, error: tx("errors.badUrl") };
  }

  let html: string;
  try {
    // Guarded: no private address, on every redirect hop.
    const res = await guardedFetch(url.toString(), {
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, error: tx("errors.fetchStatus", { status: res.status }) };
    const type = res.headers.get("content-type") ?? "";
    if (!/html|xml|text\/plain/i.test(type)) return { ok: false, error: tx("errors.notHtml") };
    html = (await res.text()).slice(0, MAX_PAGE_BYTES);
  } catch {
    return { ok: false, error: tx("errors.fetchFailed") };
  }

  const parsed = parseHtmlToMarkdown(html);
  if (!parsed.markdown.trim()) return { ok: false, error: tx("errors.noText") };
  await upsertDocument({
    clientId: Number(clientId),
    sourceType: "url",
    sourceId: url.toString(),
    title: parsed.title || url.hostname + url.pathname,
    url: url.toString(),
    text: parsed.markdown,
    manual: true,
    createdBy: me?.id ?? null,
  });
  revalidatePath(page(clientId));
  return { ok: true, data: undefined };
}

/** Only documents added by hand: a synced one would come back at the next sync. */
export async function deleteKnowledgeDocument(clientId: number, documentId: number): Promise<KbResult> {
  await requireSignedIn();
  await requireClientAccess(Number(clientId), { edit: true });
  const tx = await actionTx("knowledge");
  const [doc] = await db
    .select({ manual: kbDocuments.manual })
    .from(kbDocuments)
    .where(and(eq(kbDocuments.id, Number(documentId)), eq(kbDocuments.clientId, Number(clientId))))
    .limit(1);
  if (!doc) return { ok: false, error: tx("errors.notFound") };
  if (!doc.manual) return { ok: false, error: tx("errors.syncedDocument") };
  await deleteDocument(Number(clientId), Number(documentId));
  revalidatePath(page(clientId));
  return { ok: true, data: undefined };
}

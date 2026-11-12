/**
 * The knowledge base store: documents in, passages out.
 *
 * `upsertDocument` is idempotent on (client, source type, source id) and
 * does nothing when the text has not changed, so the sync can run often
 * and cheaply. `searchKnowledge` is full-text search (SQLite FTS5, BM25,
 * accents folded) restricted to one client. Vector search joins it in a
 * later step; the passages already carry the columns.
 */

import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, sqlite } from "@/db/client";
import { kbChunks, kbDocuments, type KbDocument } from "@/db/schema";
import { chunkText } from "./chunk";
import { currentEmbeddingModel, fuseRrf, vectorSearch } from "./vectors";

export const KB_SOURCE_TYPES = ["profile", "audit", "post", "brief", "offer", "note", "url", "file"] as const;
export type KbSourceType = (typeof KB_SOURCE_TYPES)[number];

/** Longest text kept per document. Past this a source is almost always noise. */
export const MAX_DOCUMENT_CHARS = 200_000;

export type DocumentInput = {
  clientId: number;
  sourceType: KbSourceType;
  sourceId: string;
  title: string;
  text: string;
  url?: string | null;
  manual?: boolean;
  createdBy?: number | null;
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function upsertDocument(
  input: DocumentInput,
): Promise<{ documentId: number; changed: boolean; chunks: number }> {
  const text = String(input.text ?? "").slice(0, MAX_DOCUMENT_CHARS).trim();
  const title = String(input.title ?? "").trim().slice(0, 300) || input.sourceType;
  const hash = sha(`${title}\n${text}`);

  const [existing] = await db
    .select({ id: kbDocuments.id, hash: kbDocuments.contentHash, chunks: kbDocuments.chunkCount, status: kbDocuments.status })
    .from(kbDocuments)
    .where(
      and(
        eq(kbDocuments.clientId, input.clientId),
        eq(kbDocuments.sourceType, input.sourceType),
        eq(kbDocuments.sourceId, input.sourceId),
      ),
    )
    .limit(1);
  if (existing && existing.hash === hash && existing.status === "ready") {
    return { documentId: existing.id, changed: false, chunks: existing.chunks };
  }

  const chunks = chunkText(text);
  const now = new Date();
  // Vectors of passages whose text did not change are kept: editing one
  // paragraph of an article re-embeds that paragraph, not the article.
  const kept = new Map<string, { embedding: Buffer | null; model: string | null }>();
  if (existing) {
    const old = await db
      .select({ hash: kbChunks.textHash, embedding: kbChunks.embedding, model: kbChunks.embeddingModel })
      .from(kbChunks)
      .where(eq(kbChunks.documentId, existing.id));
    for (const o of old) if (o.embedding) kept.set(o.hash, { embedding: o.embedding, model: o.model });
  }
  const documentId = sqlite.transaction(() => {
    let id = existing?.id;
    if (id) {
      db.delete(kbChunks).where(eq(kbChunks.documentId, id)).run();
      db.update(kbDocuments)
        .set({
          title,
          url: input.url ?? null,
          contentHash: hash,
          chars: text.length,
          chunkCount: chunks.length,
          status: "ready",
          error: null,
          updatedAt: now,
        })
        .where(eq(kbDocuments.id, id))
        .run();
    } else {
      const row = db
        .insert(kbDocuments)
        .values({
          clientId: input.clientId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          title,
          url: input.url ?? null,
          contentHash: hash,
          chars: text.length,
          chunkCount: chunks.length,
          manual: Boolean(input.manual),
          createdBy: input.createdBy ?? null,
        })
        .returning({ id: kbDocuments.id })
        .get();
      id = row.id;
    }
    for (const c of chunks) {
      const textHash = sha(`${c.heading ?? ""}\n${c.text}`);
      const reuse = kept.get(textHash);
      db.insert(kbChunks)
        .values({
          documentId: id,
          clientId: input.clientId,
          ordinal: c.ordinal,
          heading: c.heading,
          text: c.text,
          textHash,
          embedding: reuse?.embedding ?? null,
          embeddingModel: reuse?.model ?? null,
        })
        .run();
    }
    return id;
  })();

  return { documentId, changed: true, chunks: chunks.length };
}

/** Remove a document and its passages. Scoped to the client so an id from another client does nothing. */
export async function deleteDocument(clientId: number, documentId: number): Promise<boolean> {
  return sqlite.transaction(() => {
    const doc = db
      .select({ id: kbDocuments.id })
      .from(kbDocuments)
      .where(and(eq(kbDocuments.id, documentId), eq(kbDocuments.clientId, clientId)))
      .get();
    if (!doc) return false;
    db.delete(kbChunks).where(eq(kbChunks.documentId, documentId)).run();
    db.delete(kbDocuments).where(eq(kbDocuments.id, documentId)).run();
    return true;
  })();
}

/** Drop synced documents of these types whose source no longer exists. */
export async function pruneSynced(clientId: number, sourceType: KbSourceType, keep: Set<string>): Promise<number> {
  const rows = await db
    .select({ id: kbDocuments.id, sourceId: kbDocuments.sourceId })
    .from(kbDocuments)
    .where(and(eq(kbDocuments.clientId, clientId), eq(kbDocuments.sourceType, sourceType), eq(kbDocuments.manual, false)));
  let n = 0;
  for (const r of rows) {
    if (!keep.has(r.sourceId) && (await deleteDocument(clientId, r.id))) n++;
  }
  return n;
}

export async function listDocuments(clientId: number): Promise<KbDocument[]> {
  return db
    .select()
    .from(kbDocuments)
    .where(eq(kbDocuments.clientId, clientId))
    .orderBy(desc(kbDocuments.updatedAt), desc(kbDocuments.id));
}

export async function knowledgeStats(
  clientId: number,
): Promise<{ documents: number; passages: number; updatedAt: Date | null; vectorModel: string | null; withVectors: number }> {
  const [row] = await db
    .select({
      documents: sql<number>`count(*)`,
      passages: sql<number>`coalesce(sum(${kbDocuments.chunkCount}), 0)`,
      updatedAt: sql<number | null>`max(${kbDocuments.updatedAt})`,
    })
    .from(kbDocuments)
    .where(eq(kbDocuments.clientId, clientId));
  const vectorModel = await currentEmbeddingModel();
  const withVectors = vectorModel
    ? Number(
        (sqlite.prepare("SELECT count(*) AS n FROM kb_chunks WHERE client_id = ? AND embedding_model = ?").get(clientId, vectorModel) as { n: number }).n,
      )
    : 0;
  return {
    documents: Number(row?.documents ?? 0),
    passages: Number(row?.passages ?? 0),
    updatedAt: row?.updatedAt ? new Date(Number(row.updatedAt) * 1000) : null,
    vectorModel,
    withVectors,
  };
}

export type KbHit = {
  chunkId: number;
  documentId: number;
  title: string;
  sourceType: string;
  url: string | null;
  heading: string | null;
  text: string;
  /** Matched words wrapped in [[ ]], for highlighting. */
  snippet: string;
  score: number;
  /** Which search found it: by its words, by its meaning, or both. */
  match: "words" | "meaning" | "both";
};

/**
 * Turn what a person typed into a safe FTS5 query: words of two letters
 * or more, each quoted (so FTS syntax in the input is inert), longer ones
 * as prefixes, any of them may match. BM25 ranks passages matching more
 * and rarer words first.
 */
export function ftsQuery(input: string): string | null {
  const words = (String(input ?? "").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []).slice(0, 24);
  // Question words and articles match nearly every passage and drown the
  // words that matter; drop them unless nothing else is left.
  const meaningful = words.filter((w) => !STOPWORDS.has(w));
  const kept = meaningful.length > 0 ? meaningful : words;
  if (kept.length === 0) return null;
  // A plural ending is cut so "titres" also finds "titre" (prefix match).
  const terms = kept.map((w) => (w.length >= 5 && /[sx]$/.test(w) ? w.slice(0, -1) : w));
  const uniq = Array.from(new Set(terms));
  return uniq.map((w) => (w.length >= 4 ? `"${w}"*` : `"${w}"`)).join(" OR ");
}

const STOPWORDS = new Set(
  (
    "le la les un une des du de d l au aux et ou en à a est sont ce cet cette ces se sa son ses leur leurs " +
    "qui que quoi quel quelle quels quelles pourquoi comment quand où combien il elle ils elles on nous vous je tu " +
    "pour par sur dans avec sans pas ne plus moins très tout tous toute toutes faire fait été être avoir ont " +
    "the a an of to in on for and or is are was were be been what why how when where which who with this that " +
    "these those it its do does did can could should would my our your their"
  ).split(" "),
);

const HIT_COLUMNS = `c.id AS chunkId, c.document_id AS documentId, d.title, d.source_type AS sourceType, d.url,
              c.heading, c.text`;

function wordSearch(clientId: number, match: string, limit: number): KbHit[] {
  return (
    sqlite
      .prepare(
        `SELECT ${HIT_COLUMNS},
                snippet(kb_chunks_fts, 1, '[[', ']]', ' … ', 24) AS snippet,
                bm25(kb_chunks_fts, 2.0, 1.0) AS score
           FROM kb_chunks_fts
           JOIN kb_chunks c ON c.id = kb_chunks_fts.rowid
           JOIN kb_documents d ON d.id = c.document_id
          WHERE kb_chunks_fts MATCH ? AND c.client_id = ?
          ORDER BY score
          LIMIT ?`,
      )
      .all(match, clientId, limit) as Omit<KbHit, "match">[]
  ).map((h) => ({ ...h, match: "words" as const }));
}

function hitsById(clientId: number, ids: number[]): Map<number, Omit<KbHit, "match" | "snippet" | "score">> {
  if (ids.length === 0) return new Map();
  const rows = sqlite
    .prepare(
      `SELECT ${HIT_COLUMNS} FROM kb_chunks c JOIN kb_documents d ON d.id = c.document_id
        WHERE c.client_id = ? AND c.id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(clientId, ...ids) as Omit<KbHit, "match" | "snippet" | "score">[];
  return new Map(rows.map((r) => [r.chunkId, r]));
}

const POOL = 20;

/**
 * Search one client's knowledge. By words always (FTS5); by meaning too
 * when a vectors model is set and the client's passages have vectors,
 * the two lists then merged with RRF. Falls back to words alone if the
 * question cannot be embedded (no key, cap reached, provider down).
 */
export async function searchKnowledge(
  clientId: number,
  query: string,
  limit = 8,
  opts: { channel?: "app" | "assistant" | "background" | "portal" } = {},
): Promise<KbHit[]> {
  const n = Math.max(1, Math.min(50, limit));
  const match = ftsQuery(query);
  const words = match ? wordSearch(clientId, match, POOL) : [];

  const model = await currentEmbeddingModel();
  const hasVectors =
    model &&
    sqlite
      .prepare("SELECT 1 FROM kb_chunks WHERE client_id = ? AND embedding_model = ? LIMIT 1")
      .get(clientId, model);
  if (!model || !hasVectors || !String(query ?? "").trim()) return words.slice(0, n);

  const { embedTexts } = await import("@/lib/ai-call");
  const q = await embedTexts({ texts: [String(query).slice(0, 2000)], feature: "kb_search", channel: opts.channel ?? "app", clientId });
  if (!q.ok || q.model !== model) return words.slice(0, n);

  const meaning = vectorSearch(clientId, q.vectors[0], model, POOL);
  const fused = fuseRrf([
    { ids: meaning.map((m) => m.chunkId), weight: 0.7 },
    { ids: words.map((w) => w.chunkId), weight: 0.3 },
  ]).slice(0, n);

  const byWords = new Map(words.map((w) => [w.chunkId, w]));
  const inMeaning = new Set(meaning.map((m) => m.chunkId));
  const others = hitsById(
    clientId,
    fused.map((f) => f.id).filter((id) => !byWords.has(id)),
  );
  const out: KbHit[] = [];
  for (const f of fused) {
    const w = byWords.get(f.id);
    if (w) {
      out.push({ ...w, score: f.score, match: inMeaning.has(f.id) ? "both" : "words" });
      continue;
    }
    const o = others.get(f.id);
    if (!o) continue;
    const snippet = o.text.length > 280 ? `${o.text.slice(0, 280)} …` : o.text;
    out.push({ ...o, snippet, score: f.score, match: "meaning" });
  }
  return out;
}

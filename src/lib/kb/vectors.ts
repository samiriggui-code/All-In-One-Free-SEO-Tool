/**
 * Meaning-based search for the knowledge base.
 *
 * Passages get a vector from the "Vectors" model (Settings → AI), stored
 * as a Float32 BLOB next to the passage (about 6 KB for 1 536 numbers).
 * Search embeds the question and ranks the client's passages by cosine
 * similarity; store.ts merges that list with the full-text one (RRF).
 *
 * A brute-force scan is fine at agency scale: 5 000 passages of 1 536
 * floats is ~30 MB read and well under 100 ms. An ANN index is not worth
 * a native dependency before that.
 */

import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db, sqlite } from "@/db/client";
import { kbChunks } from "@/db/schema";
import { embedTexts } from "@/lib/ai-call";
import { normalizePurposeModel, purposeSettingKey } from "@/lib/ai-purpose";
import { getSetting } from "@/lib/settings-store";

const BATCH = 32;

export function toBlob(v: number[] | Float32Array): Buffer {
  const f = v instanceof Float32Array ? v : Float32Array.from(v);
  return Buffer.from(f.buffer, f.byteOffset, f.byteLength);
}

export function fromBlob(b: Buffer | Uint8Array): Float32Array {
  // Copy: the Buffer may sit at an offset not aligned to 4 bytes.
  const copy = new Uint8Array(b.byteLength);
  copy.set(b);
  return new Float32Array(copy.buffer);
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** The vectors model in use, or null when search is by words only. */
export async function currentEmbeddingModel(): Promise<string | null> {
  const chosen = normalizePurposeModel(
    await getSetting<unknown>(purposeSettingKey("embeddings")).catch(() => null),
    "embeddings",
  );
  return chosen?.model ?? null;
}

/**
 * Give a vector to every passage that has none, or one from another
 * model. Bounded per run so a first sync of a big base spreads over a
 * few scheduler ticks instead of one long burst.
 */
export async function embedPendingChunks(opts: { clientId?: number; max?: number } = {}): Promise<{ embedded: number; error?: string }> {
  const model = await currentEmbeddingModel();
  if (!model) return { embedded: 0 };
  const max = opts.max ?? 640;
  const pending = await db
    .select({ id: kbChunks.id, clientId: kbChunks.clientId, heading: kbChunks.heading, text: kbChunks.text })
    .from(kbChunks)
    .where(
      and(
        opts.clientId ? eq(kbChunks.clientId, opts.clientId) : sql`1 = 1`,
        or(isNull(kbChunks.embedding), ne(kbChunks.embeddingModel, model)),
      ),
    )
    .limit(max);

  let embedded = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const res = await embedTexts({
      texts: batch.map((c) => (c.heading ? `${c.heading}\n\n${c.text}` : c.text)),
      clientId: opts.clientId ?? null,
    });
    if (!res.ok) return { embedded, error: res.failure.message };
    const update = sqlite.prepare("UPDATE kb_chunks SET embedding = ?, embedding_model = ? WHERE id = ?");
    sqlite.transaction(() => {
      batch.forEach((c, j) => update.run(toBlob(res.vectors[j]), res.model, c.id));
    })();
    embedded += batch.length;
  }
  return { embedded };
}

/** The client's passages closest in meaning to `vector`, best first. */
export function vectorSearch(clientId: number, vector: number[], model: string, limit = 20): { chunkId: number; similarity: number }[] {
  const q = Float32Array.from(vector);
  const rows = sqlite
    .prepare("SELECT id, embedding FROM kb_chunks WHERE client_id = ? AND embedding IS NOT NULL AND embedding_model = ?")
    .all(clientId, model) as { id: number; embedding: Buffer }[];
  return rows
    .map((r) => ({ chunkId: r.id, similarity: cosine(q, fromBlob(r.embedding)) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Reciprocal rank fusion: each list votes 1/(k + rank) for its items,
 * weighted. Meaning gets more weight than words (0.7 / 0.3), as in
 * GsKnora; an item found by both lists rises above either alone.
 */
export function fuseRrf(
  lists: { ids: number[]; weight: number }[],
  k = 60,
): { id: number; score: number }[] {
  const score = new Map<number, number>();
  for (const { ids, weight } of lists) {
    ids.forEach((id, rank) => score.set(id, (score.get(id) ?? 0) + weight / (k + rank + 1)));
  }
  return Array.from(score.entries())
    .map(([id, s]) => ({ id, score: s }))
    .sort((a, b) => b.score - a.score);
}

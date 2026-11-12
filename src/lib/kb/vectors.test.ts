import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { setSetting } from "@/lib/settings-store";

/**
 * A toy embedding: one dimension per concept, so "livraison" and
 * "livrés" land on the same axis the way a real model would put them
 * close together, while sharing no word for full-text search.
 */
const CONCEPTS: RegExp[] = [/livr/i, /prix|tarif/i, /pain|levain/i, /audit|score/i];
const toy = (t: string) => CONCEPTS.map((re) => (re.test(t) ? 1 : 0.01));
const embed = vi.fn(async ({ texts }: { texts: string[] }) => ({
  ok: true as const,
  vectors: texts.map(toy),
  model: "text-embedding-3-small",
  provider: "openai",
}));
vi.mock("@/lib/ai-call", () => ({ embedTexts: (a: { texts: string[] }) => embed(a) }));

const { cosine, fromBlob, fuseRrf, toBlob, embedPendingChunks } = await import("./vectors");
const { searchKnowledge, upsertDocument, knowledgeStats } = await import("./store");

describe("vector helpers", () => {
  it("round-trips Float32 vectors through a BLOB", () => {
    const v = [0.25, -1.5, 3];
    expect(Array.from(fromBlob(toBlob(v)))).toEqual(v);
  });

  it("measures cosine similarity", () => {
    expect(cosine(Float32Array.from([1, 0]), Float32Array.from([1, 0]))).toBeCloseTo(1);
    expect(cosine(Float32Array.from([1, 0]), Float32Array.from([0, 1]))).toBeCloseTo(0);
    expect(cosine(Float32Array.from([1]), Float32Array.from([1, 2]))).toBe(0);
  });

  it("ranks an item found by both lists first", () => {
    const fused = fuseRrf([
      { ids: [10, 20, 30], weight: 0.7 },
      { ids: [30, 40], weight: 0.3 },
    ]);
    expect(fused.map((f) => f.id)).toEqual([30, 10, 20, 40]);
  });
});

describe("hybrid search", () => {
  let id = 0;
  beforeAll(async () => {
    id = (await db.insert(clients).values({ name: "KB vec", url: "https://kb-vec.example" }).returning({ id: clients.id }))[0].id;
    await setSetting("ai.model.embeddings", { provider: "openai", model: "text-embedding-3-small" });
  });

  it("finds a passage by meaning when no word matches, and reuses vectors of unchanged passages", async () => {
    await upsertDocument({
      clientId: id,
      sourceType: "note",
      sourceId: "v1",
      title: "Commandes",
      text: "# Entreprises\n\nPlateaux livrés avant 8 h.\n\n# Boutique\n\nPain au levain tous les matins.",
    });
    const first = await embedPendingChunks({ clientId: id });
    expect(first.embedded).toBe(2);
    expect((await knowledgeStats(id)).withVectors).toBe(2);

    // No passage contains the word "livraison"; meaning search still finds it.
    const hits = await searchKnowledge(id, "livraison");
    expect(hits[0]?.text).toContain("livrés");
    expect(hits[0]?.match).toBe("meaning");

    // Edit one section only: the other keeps its vector.
    await upsertDocument({
      clientId: id,
      sourceType: "note",
      sourceId: "v1",
      title: "Commandes",
      text: "# Entreprises\n\nPlateaux livrés avant 8 h.\n\n# Boutique\n\nPain au levain et brioches tous les matins.",
    });
    embed.mockClear();
    const second = await embedPendingChunks({ clientId: id });
    expect(second.embedded).toBe(1);
  });
});

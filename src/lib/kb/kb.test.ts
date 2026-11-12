import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, kbChunks } from "@/db/schema";
import { chunkText, MAX_CHARS } from "./chunk";
import { deleteDocument, ftsQuery, knowledgeStats, pruneSynced, searchKnowledge, upsertDocument } from "./store";

describe("chunkText", () => {
  it("cuts on headings and keeps the heading on each passage", () => {
    const chunks = chunkText("Intro.\n\n# Titre\n\nPremier paragraphe.\n\n## Délais\n\nLivraison en 48 h.");
    expect(chunks.map((c) => c.heading)).toEqual([null, "Titre", "Délais"]);
    expect(chunks[2].text).toBe("Livraison en 48 h.");
  });

  it("never returns a passage longer than the maximum", () => {
    const long = Array.from({ length: 200 }, (_, i) => `Phrase numéro ${i} sur le référencement local.`).join(" ");
    const chunks = chunkText(`# Long\n\n${long}`);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(MAX_CHARS);
  });

  it("returns nothing for empty text", () => {
    expect(chunkText("  \n ")).toEqual([]);
  });
});

describe("ftsQuery", () => {
  it("quotes words so FTS syntax in the input is inert", () => {
    expect(ftsQuery('score NEAR( "drop" OR *')).toBe('"score"* OR "near"* OR "drop"*');
    expect(ftsQuery("?!")).toBeNull();
  });

  it("drops question words and folds plurals", () => {
    expect(ftsQuery("Pourquoi les titres posent problème ?")).toBe('"titre"* OR "posent"* OR "problème"*');
    expect(ftsQuery("why")).toBe('"why"');
  });
});

describe("knowledge store", () => {
  let a = 0;
  let b = 0;
  beforeAll(async () => {
    a = (await db.insert(clients).values({ name: "KB A", url: "https://kb-a.example" }).returning({ id: clients.id }))[0].id;
    b = (await db.insert(clients).values({ name: "KB B", url: "https://kb-b.example" }).returning({ id: clients.id }))[0].id;
  });

  it("indexes, finds with accents folded, and stays within one client", async () => {
    await upsertDocument({ clientId: a, sourceType: "note", sourceId: "n1", title: "Ton", text: "# Ton de la marque\n\nLe client vouvoie toujours ses clients. Référencement local à Lyon." });
    await upsertDocument({ clientId: b, sourceType: "note", sourceId: "n1", title: "Autre", text: "Référencement local à Lille." });
    const hits = await searchKnowledge(a, "referencement lyon");
    expect(hits.length).toBe(1);
    expect(hits[0].heading).toBe("Ton de la marque");
    expect(hits[0].snippet).toMatch(/\[\[Lyon\]\]/);
    expect((await searchKnowledge(b, "vouvoie")).length).toBe(0);
  });

  it("does nothing when the text has not changed, and replaces passages when it has", async () => {
    const first = await upsertDocument({ clientId: a, sourceType: "audit", sourceId: "7", title: "Audit", text: "Score 62." });
    expect(first.changed).toBe(true);
    expect((await upsertDocument({ clientId: a, sourceType: "audit", sourceId: "7", title: "Audit", text: "Score 62." })).changed).toBe(false);
    await upsertDocument({ clientId: a, sourceType: "audit", sourceId: "7", title: "Audit", text: "Score 81 après corrections." });
    const rows = await db.select().from(kbChunks).where(eq(kbChunks.documentId, first.documentId));
    expect(rows.map((r) => r.text)).toEqual(["Score 81 après corrections."]);
    expect((await searchKnowledge(a, "62")).length).toBe(0);
    expect((await searchKnowledge(a, "corrections")).length).toBe(1);
  });

  it("prunes synced documents whose source is gone, and deletes cleanly", async () => {
    await upsertDocument({ clientId: a, sourceType: "post", sourceId: "1", title: "P1", text: "Article un." });
    await upsertDocument({ clientId: a, sourceType: "post", sourceId: "2", title: "P2", text: "Article deux." });
    expect(await pruneSynced(a, "post", new Set(["1"]))).toBe(1);
    expect((await searchKnowledge(a, "deux")).length).toBe(0);
    const before = await knowledgeStats(a);
    const doc = await upsertDocument({ clientId: a, sourceType: "note", sourceId: "tmp", title: "Tmp", text: "Temporaire." });
    expect(await deleteDocument(b, doc.documentId)).toBe(false);
    expect(await deleteDocument(a, doc.documentId)).toBe(true);
    expect((await knowledgeStats(a)).documents).toBe(before.documents);
    expect((await searchKnowledge(a, "temporaire")).length).toBe(0);
  });
});

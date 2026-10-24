import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createPost,
  deletePost,
  getPost,
  getStyleProfile,
  listKeywordResearch,
  listPosts,
  saveKeywordResearch,
  setStyleProfile,
  updatePost,
} from "./store";

let a = 0;
let b = 0;

beforeEach(async () => {
  const rows = await db
    .insert(clients)
    .values([
      { name: "Studio A", url: "https://a.example" },
      { name: "Studio B", url: "https://b.example" },
    ])
    .returning({ id: clients.id });
  a = rows[0].id;
  b = rows[1].id;
});

afterEach(async () => {
  await db.delete(clients).where(eq(clients.id, a));
  await db.delete(clients).where(eq(clients.id, b));
});

describe("content studio store", () => {
  it("creates, reads and updates a post within its client", async () => {
    const post = await createPost(a, { title: "Guide", primaryKeyword: "seo audit" });
    expect(post.status).toBe("idea");

    const updated = await updatePost(a, post.id, { status: "draft", draftMarkdown: "# Guide" });
    expect(updated?.status).toBe("draft");
    expect((await getPost(a, post.id))?.draftMarkdown).toBe("# Guide");
    expect((await listPosts(a)).map((p) => p.id)).toEqual([post.id]);
  });

  it("never lets one client's id reach another client's post", async () => {
    const post = await createPost(a, { title: "Private" });
    expect(await getPost(b, post.id)).toBeNull();
    expect(await updatePost(b, post.id, { title: "Hijacked" })).toBeNull();
    expect(await deletePost(b, post.id)).toBe(false);
    expect((await getPost(a, post.id))?.title).toBe("Private");
    expect(await listPosts(b)).toEqual([]);
  });

  it("deletes a client's posts with the client", async () => {
    const post = await createPost(a, { title: "Gone" });
    await db.delete(clients).where(eq(clients.id, a));
    expect(await getPost(a, post.id)).toBeNull();
  });

  it("stores keyword research and the brand voice", async () => {
    await saveKeywordResearch(a, "fr", {
      seed: "audit seo",
      autocomplete: ["audit seo gratuit"],
      paa: ["Comment faire un audit SEO ?"],
      serpTop10: [{ position: 1, title: "Audit", url: "https://x.example", snippet: "" }],
      suggested: [
        { keyword: "audit seo gratuit", source: "autocomplete", intent: { intent: "commercial", confidence: 0.6 } },
      ],
    } as never);
    const [run] = await listKeywordResearch(a);
    expect(run.seed).toBe("audit seo");
    expect(run.paa).toEqual(["Comment faire un audit SEO ?"]);

    expect(await getStyleProfile(a)).toBeNull();
    await setStyleProfile(a, { tone: "conversational", headingCase: "sentence", language: "fr" });
    expect((await getStyleProfile(a))?.tone).toBe("conversational");
  });
});

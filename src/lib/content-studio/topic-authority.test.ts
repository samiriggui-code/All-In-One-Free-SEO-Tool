import { afterEach, describe, expect, it, vi } from "vitest";
import { scoreTopicAuthority } from "./seo/topic-authority";

afterEach(() => vi.unstubAllGlobals());

describe("topic authority", () => {
  it("asks the client's Wikipedia and matches accented sub-topics", async () => {
    const hosts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        hosts.push(new URL(url).host);
        const body = url.includes("list=search")
          ? { query: { search: [{ title: "Boulangerie" }] } }
          : {
              parse: {
                title: "Boulangerie",
                sections: [
                  { line: "Énergie du four", level: "2" },
                  { line: "Levain", level: "2" },
                  { line: "Voir aussi", level: "2" },
                ],
                links: [],
              },
            };
        return new Response(JSON.stringify(body));
      }),
    );

    const r = await scoreTopicAuthority("boulangerie", "Maîtriser l'énergie du four et la pâte.", "fr-FR");

    expect(hosts).toEqual(["fr.wikipedia.org", "fr.wikipedia.org"]);
    expect(r.covered.map((c) => c.entity)).toEqual(["Énergie du four"]);
    expect(r.missing.map((m) => m.entity)).toEqual(["Levain"]);
    expect(r.score).toBe(50);
  });
});

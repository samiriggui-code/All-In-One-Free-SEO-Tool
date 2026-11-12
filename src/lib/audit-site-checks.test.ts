import { describe, expect, it } from "vitest";
import { findFacetTrap, findStaleContent, pageDate } from "./audit-site-checks";

const links = (hrefs: string[]) => hrefs.map((h) => `<a href="${h}">x</a>`).join("");
const filters = (n: number, path = "/chaussures") =>
  Array.from({ length: n }, (_, i) => `${path}?color=c${i}&sort=price`);

describe("findFacetTrap", () => {
  it("reports filter URLs left open, with the worst listing", () => {
    const trap = findFacetTrap([
      { url: "https://shop.fr/chaussures", html: links([...filters(12), "/chaussures?page=2", "/contact"]) },
    ]);
    expect(trap).toMatchObject({ urlCount: 12, worstPath: "/chaussures", worstCount: 12, params: ["color", "sort"] });
    expect(trap?.example).toBe("https://shop.fr/chaussures?color=c0&sort=price");
  });

  it("says nothing for a handful of filters, pagination, tracking or other sites", () => {
    expect(findFacetTrap([{ url: "https://shop.fr/", html: links(filters(4)) }])).toBeNull();
    expect(
      findFacetTrap([
        {
          url: "https://shop.fr/",
          html: links([
            ...Array.from({ length: 30 }, (_, i) => `/blog?page=${i}`),
            ...Array.from({ length: 30 }, (_, i) => `https://autre.fr/p?color=${i}`),
            "/?utm_source=x",
          ]),
        },
      ]),
    ).toBeNull();
    expect(findFacetTrap([])).toBeNull();
  });

  it("leaves a listing alone when its filter pages are canonicalised away or noindex", () => {
    const listing = { url: "https://shop.fr/chaussures", html: links(filters(15)) };
    const canonical = {
      url: "https://shop.fr/chaussures?color=c0&sort=price",
      html: '<link rel="canonical" href="/chaussures">',
    };
    const noindex = {
      url: "https://shop.fr/chaussures?color=c1&sort=price",
      html: '<meta name="robots" content="noindex, follow">',
    };
    const selfCanonical = {
      url: "https://shop.fr/chaussures?color=c2&sort=price",
      html: '<link rel="canonical" href="/chaussures?color=c2&sort=price">',
    };
    expect(findFacetTrap([listing, canonical])).toBeNull();
    expect(findFacetTrap([listing, noindex])).toBeNull();
    expect(findFacetTrap([listing, selfCanonical])?.urlCount).toBe(15);
  });
});

describe("findStaleContent", () => {
  const now = new Date("2026-11-12T00:00:00Z");
  const article = (modified: string) => `<script type="application/ld+json">{"dateModified":"${modified}"}</script>`;

  it("reads the newest date a page gives", () => {
    expect(
      pageDate('{"datePublished":"2020-01-01","dateModified":"2025-03-02"}')?.toISOString().slice(0, 10),
    ).toBe("2025-03-02");
    expect(pageDate('<meta property="article:modified_time" content="2024-05-06T10:00:00Z">')?.getUTCFullYear()).toBe(2024);
    expect(pageDate("<p>no date</p>")).toBeNull();
  });

  it("counts pages dated more than two years ago, and names the oldest", () => {
    const stale = findStaleContent(
      [
        { url: "https://x.fr/a", html: article("2021-06-01") },
        { url: "https://x.fr/b", html: article("2019-02-01") },
        { url: "https://x.fr/c", html: article("2026-01-01") },
        { url: "https://x.fr/d", html: "<p>undated</p>" },
      ],
      now,
    );
    expect(stale).toEqual({ count: 2, dated: 3, oldestUrl: "https://x.fr/b", oldestYear: 2019 });
  });

  it("says nothing when every dated page is recent, or none is dated", () => {
    expect(findStaleContent([{ url: "https://x.fr/c", html: article("2025-06-01") }], now)).toBeNull();
    expect(findStaleContent([{ url: "https://x.fr/d", html: "<p>undated</p>" }], now)).toBeNull();
  });
});

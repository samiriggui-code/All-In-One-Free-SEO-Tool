import { describe, it, expect } from "vitest";
import { unwrapSerpUrl, isSearchEngineUrl } from "@/lib/content-studio/seo/serp-url";

// Bing serves every organic href as a /ck/a click-tracker whose `u=a1<base64url>`
// param holds the real destination. Leaving it wrapped made every result look
// like it lived on bing.com, which silently broke rank matching.
function bingWrap(target: string): string {
  const b64 = Buffer.from(target, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `https://www.bing.com/ck/a?!&&p=deadbeef&ptn=3&fclid=abc&u=a1${b64}&ntb=1`;
}

describe("unwrapSerpUrl", () => {
  it("decodes a Bing click-tracker to the real destination", () => {
    expect(unwrapSerpUrl(bingWrap("https://www.seoptimer.com/"))).toBe("https://www.seoptimer.com/");
  });

  it("decodes a Bing tracker for a deep URL with query params", () => {
    const target = "https://example.com/blog/seo-audit?utm_source=x&page=2";
    expect(unwrapSerpUrl(bingWrap(target))).toBe(target);
  });

  it("decodes a DuckDuckGo /l/?uddg= redirect", () => {
    const href = "https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fguide&rut=abc";
    expect(unwrapSerpUrl(href)).toBe("https://example.com/guide");
  });

  it("decodes a plain ?url= redirect", () => {
    const href = "https://r.example.org/go?url=https%3A%2F%2Ftarget.dev%2Fpage";
    expect(unwrapSerpUrl(href)).toBe("https://target.dev/page");
  });

  it("returns non-redirect URLs unchanged", () => {
    expect(unwrapSerpUrl("https://example.com/page")).toBe("https://example.com/page");
  });

  it("returns the input unchanged when the payload is not decodable", () => {
    const href = "https://www.bing.com/ck/a?u=a1!!!notbase64!!!";
    expect(unwrapSerpUrl(href)).toBe(href);
  });

  it("handles empty input without throwing", () => {
    expect(unwrapSerpUrl("")).toBe("");
  });
});

describe("isSearchEngineUrl", () => {
  it("flags an un-decoded engine URL", () => {
    expect(isSearchEngineUrl("https://www.bing.com/ck/a?u=a1xx")).toBe(true);
    expect(isSearchEngineUrl("https://duckduckgo.com/l/?uddg=x")).toBe(true);
  });

  it("does not flag a real destination", () => {
    expect(isSearchEngineUrl("https://www.seoptimer.com/")).toBe(false);
  });

  it("does not throw on a malformed URL", () => {
    expect(isSearchEngineUrl("not a url")).toBe(false);
  });
});

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Auditor } from "@/audit/engine/auditor";
import { categories } from "@/audit/engine/categories";
import { getRuleCount } from "@/audit/engine/rule-registry";
import { withNetPolicy } from "@/audit/crawler/net";
import "@/audit/rules";
import { renderLlmReport } from "@/audit/report/llm";
import { renderMarkdownReport } from "@/audit/report/markdown";

const PAGES: Record<string, string> = {
  "/": `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Acme widgets: durable widgets for every workshop</title>
<meta name="description" content="Acme makes durable widgets for workshops, garages and factories. Browse the catalogue and order online with free delivery.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="/">
</head><body><header><nav><a href="/about">About</a> <a href="/contact">Contact</a></nav></header>
<main><h1>Durable widgets</h1>
<p>${"Acme widgets are built to last for decades of daily use in demanding workshops. ".repeat(12)}</p>
<img src="/w.png" alt="A steel widget" width="400" height="300">
</main><footer>© Acme</footer></body></html>`,
  "/about": `<!doctype html><html lang="en"><head><title>About Acme</title></head>
<body><h1>About</h1><p>Short.</p><a href="/">Home</a></body></html>`,
  "/contact": `<!doctype html><html><head><meta name="robots" content="noindex"><title>Contact</title></head>
<body><h1>Contact</h1><a href="/">Home</a></body></html>`,
};

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (path === "/robots.txt") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
      return;
    }
    if (path === "/sitemap.xml") {
      res.writeHead(200, { "content-type": "application/xml" });
      res.end(
        `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
          Object.keys(PAGES)
            .map((p) => `<url><loc>${origin}${p}</loc></url>`)
            .join("") +
          `</urlset>`,
      );
      return;
    }
    const body = PAGES[path];
    if (!body) {
      res.writeHead(404, { "content-type": "text/html" });
      res.end("<html><body>Not found</body></html>");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe("Auditor", () => {
  it("registers the full SEOmator catalogue", () => {
    expect(getRuleCount()).toBe(373);
    expect(categories).toHaveLength(20);
  });

  it("audits a single page with every category", { timeout: 60_000 }, async () => {
    const result = await withNetPolicy({ allowPrivate: true }, () =>
      new Auditor({ timeout: 10_000 }).audit(`${origin}/`),
    );
    expect(result.categoryResults).toHaveLength(20);
    const ruleIds = new Set(result.categoryResults.flatMap((c) => c.results.map((r) => r.ruleId)));
    expect(ruleIds.size).toBe(373);
    const crashed = result.categoryResults
      .flatMap((c) => c.results)
      .filter((r) => r.message.startsWith("Rule execution failed"));
    expect(crashed.map((r) => `${r.ruleId}: ${r.message}`)).toEqual([]);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);

    const markdown = renderMarkdownReport(result);
    expect(markdown).toContain("## Category Breakdown");
    expect(markdown).toContain("**Fix:**");
    const llm = renderLlmReport(result);
    const nonce = /nonce="([0-9a-f]{32})"/.exec(llm)?.[1];
    expect(nonce).toBeDefined();
    expect(llm).toContain(`<msg><untrusted-${nonce}>`);
    expect(llm.endsWith("</seo-audit>")).toBe(true);
  });

  it("caps a crawl by its start page only and records per-page results", { timeout: 60_000 }, async () => {
    const result = await withNetPolicy({ allowPrivate: true }, () =>
      new Auditor({ timeout: 10_000 }).auditWithCrawl(`${origin}/`, 5, 2),
    );
    expect(result.crawledPages).toBe(3);
    expect(result.scoreCap).toBeUndefined();
    const noindex = result.categoryResults
      .flatMap((c) => c.results)
      .filter((r) => r.ruleId === "core-robots-meta" && r.status !== "pass");
    expect(noindex.length).toBeGreaterThan(0);
  });

  it("refuses private addresses unless the run allows them", async () => {
    await expect(new Auditor({ timeout: 5_000 }).audit(`${origin}/`)).rejects.toThrow();
  });
});

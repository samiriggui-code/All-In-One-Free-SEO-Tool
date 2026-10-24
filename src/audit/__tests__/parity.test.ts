/**
 * Parity with the reference engine.
 *
 * `seomator-golden.json` holds the status of every rule on every page of the
 * fixture site as the published @seomator/seo-audit 7.0.0 reports it, single
 * page and crawl. The port must agree rule for rule: a status that moves here
 * is a behaviour change, made on purpose or by accident.
 *
 * To regenerate after a deliberate change, run the reference package against
 * `fixture-site.mjs` on port 18765 and rewrite the golden file.
 */
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuditor } from "@/audit/engine/auditor";
import { withNetPolicy } from "@/audit/crawler/net";
import type { AuditResult } from "@/audit/types";
import { handler } from "./fixture-site.mjs";

type Golden = { overallScore: number; categories: Record<string, number>; statuses: string[] };
const golden = JSON.parse(readFileSync(join(__dirname, "seomator-golden.json"), "utf8")) as Record<
  "single" | "crawl",
  Golden
>;

// The golden file records URLs relative to this origin.
const PORT = 18765;
const ORIGIN = `http://127.0.0.1:${PORT}`;
let server: Server;

beforeAll(async () => {
  server = createServer(handler(() => ORIGIN));
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));
});
afterAll(() => {
  server.close();
});

function summarize(result: AuditResult): Golden {
  return {
    overallScore: result.overallScore,
    categories: Object.fromEntries(result.categoryResults.map((c) => [c.categoryId, c.score])),
    statuses: result.categoryResults
      .flatMap((c) => c.results)
      .map((r) => `${r.ruleId} ${String(r.details?.pageUrl ?? "").replace(ORIGIN, "") || "/"} ${r.status}`)
      .sort(),
  };
}

describe("parity with @seomator/seo-audit", () => {
  it("matches every rule on a single page", { timeout: 60_000 }, async () => {
    const result = await withNetPolicy({ allowPrivate: true }, () =>
      createAuditor({ timeout: 10_000 }).audit(`${ORIGIN}/`),
    );
    const ours = summarize(result);
    expect(ours.statuses).toEqual(golden.single.statuses);
    expect(ours.categories).toEqual(golden.single.categories);
    expect(ours.overallScore).toBe(golden.single.overallScore);
  });

  it("matches every rule on every page of a crawl", { timeout: 120_000 }, async () => {
    const result = await withNetPolicy({ allowPrivate: true }, () =>
      createAuditor({ timeout: 10_000 }).auditWithCrawl(`${ORIGIN}/`, 10, 1),
    );
    const ours = summarize(result);
    expect(ours.statuses).toEqual(golden.crawl.statuses);
    expect(ours.categories).toEqual(golden.crawl.categories);
    expect(ours.overallScore).toBe(golden.crawl.overallScore);
  });
});

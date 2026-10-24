"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { recordToolRun, type FindingDraft } from "@/lib/tool-findings";
import { guardedFetch, SsrfBlockedError } from "@/lib/url-guard";

export type RobotsResult =
  | {
      ok: true;
      robotsUrl: string;
      robotsContent: string | null;
      sitemaps: SitemapEntry[];
      issues: string[];
    }
  | { ok: false; error: string };

export type SitemapEntry = {
  url: string;
  ok: boolean;
  type: "index" | "urlset" | "unknown";
  count: number;
  fetchError?: string;
  childSitemaps?: string[];
  /** The guard refused this address; we never asked the site for it. */
  blocked?: boolean;
};

function normalize(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

async function fetchText(
  url: string,
  allowPrivate = false,
  timeoutMs = 10_000,
): Promise<{
  ok: boolean;
  status: number;
  body: string;
  error?: string;
  /**
   * The SSRF guard refused this address — we never asked for it.
   *
   * Distinct from a fetch that failed, because the two mean opposite
   * things about the site. "We would not connect to a private address"
   * is a fact about this tool; reporting it as a high-severity finding
   * would tell a self-hoster auditing their own LAN that their robots.txt
   * is broken, every night, forever.
   */
  blocked?: boolean;
}> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await guardedFetch(url, {
      allowPrivate,
      signal: c.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; SeoToolBot/0.1; +https://localhost)",
      },
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: "",
      error: (err as Error).message,
      blocked: err instanceof SsrfBlockedError,
    };
  } finally {
    clearTimeout(t);
  }
}

export async function checkRobots(
  rawUrl: string,
  clientId?: number | null,
  /**
   * Permit loopback and private addresses.
   *
   * Off by default and never set by the UI or the nightly sweep, both of
   * which take a URL somebody typed. The fixture harness sets it, the
   * same way scripts/audit-fixtures.ts does for the crawler — without
   * it, a tool whose whole job is fetching URLs cannot be tested against
   * a local fixture at all.
   */
  allowPrivate = false,
): Promise<RobotsResult> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.robots");
  if (!rawUrl?.trim()) return { ok: false, error: t("errUrlRequired") };
  const url = normalize(rawUrl.trim());

  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return { ok: false, error: t("errInvalidUrl") };
  }
  const robotsUrl = `${origin}/robots.txt`;
  const robotsRes = await fetchText(robotsUrl, allowPrivate);

  const issues: string[] = [];
  // The same problems, with an identity that survives across runs. The
  // display strings above carry counts and wording that change; matching
  // on them would make every re-run a fresh set of findings nobody could
  // ever mark resolved.
  const findings: FindingDraft[] = [];
  let robotsContent: string | null = null;
  const sitemapUrls: string[] = [];

  if (robotsRes.ok) {
    robotsContent = robotsRes.body.slice(0, 200_000);
    // Parse sitemap entries
    for (const line of robotsContent.split(/\r?\n/)) {
      const m = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
      if (m) sitemapUrls.push(m[1].trim());
    }
    // Check for common foot-guns
    if (/^\s*disallow:\s*\/\s*$/im.test(robotsContent) && !/^\s*allow:/im.test(robotsContent)) {
      issues.push(t("issueBlocksAll"));
      findings.push({
        signature: "robots.blocks_everything",
        title: t("findBlocksAllTitle"),
        severity: "critical",
        category: "crawling",
        details: t("findBlocksAllDetails"),
      });
    }
    if (!sitemapUrls.length) {
      issues.push(t("issueNoSitemapDirective"));
      findings.push({
        signature: "robots.no_sitemap_directive",
        title: t("findNoSitemapDirectiveTitle"),
        severity: "low",
        category: "crawling",
        details: t("findNoSitemapDirectiveDetails"),
      });
    }
  } else {
    issues.push(
      robotsRes.status === 404
        ? t("issueMissing")
        : t("issueUnreachable", {
            status: robotsRes.status,
            error: robotsRes.error ?? "",
          }),
    );
    // A 404 is a site with no robots.txt. Any other failure is a site we
    // could not reach, which is a different problem with a different fix,
    // and reporting them under one signature would make the fix for one
    // look like it had resolved the other.
    if (!robotsRes.blocked)
      findings.push(
      robotsRes.status === 404
        ? {
            signature: "robots.missing",
            title: t("findMissingTitle"),
            severity: "medium",
            category: "crawling",
            details: t("findMissingDetails"),
          }
        : {
            signature: "robots.unreachable",
            title: t("findUnreachableTitle"),
            severity: "high",
            category: "crawling",
            details: t("findUnreachableDetails", {
              status: robotsRes.status || t("noResponse"),
            }),
          },
    );
    sitemapUrls.push(`${origin}/sitemap.xml`);
  }

  // Validate every sitemap URL
  const sitemaps: SitemapEntry[] = [];
  for (const sm of [...new Set(sitemapUrls)].slice(0, 12)) {
    const res = await fetchText(sm, allowPrivate);
    if (!res.ok) {
      sitemaps.push({
        url: sm,
        ok: false,
        type: "unknown",
        count: 0,
        fetchError: `${res.status} ${res.error ?? ""}`.trim(),
        blocked: res.blocked,
      });
      continue;
    }

    const body = res.body.slice(0, 1_500_000);
    if (/<sitemapindex/i.test(body)) {
      const childMatches = [...body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(
        (m) => m[1].trim(),
      );
      sitemaps.push({
        url: sm,
        ok: true,
        type: "index",
        count: childMatches.length,
        childSitemaps: childMatches.slice(0, 25),
      });
    } else if (/<urlset/i.test(body)) {
      const urlCount = (body.match(/<url\b/gi) ?? []).length;
      sitemaps.push({
        url: sm,
        ok: true,
        type: "urlset",
        count: urlCount,
      });
    } else {
      sitemaps.push({
        url: sm,
        ok: false,
        type: "unknown",
        count: 0,
        fetchError: t("invalidSitemapXml"),
      });
    }
  }

  if (sitemaps.length === 0 && !robotsRes.blocked) {
    issues.push(t("issueNoSitemapFound"));
    findings.push({
      signature: "robots.no_sitemap_found",
      title: t("findNoSitemapFoundTitle"),
      severity: "medium",
      category: "crawling",
      details: t("findNoSitemapFoundDetails"),
    });
  }
  // A sitemap that is declared and broken is worse than one that is
  // absent: the site asserts it exists, and the crawler gets an error.
  // A sitemap we refused to fetch is not a sitemap that is broken.
  for (const sm of sitemaps.filter((x) => !x.ok && !x.blocked)) {
    findings.push({
      signature: `robots.sitemap_broken.${sm.url}`,
      title: t("findSitemapBrokenTitle", { url: sm.url }),
      severity: "high",
      category: "crawling",
      details: sm.fetchError
        ? t("findSitemapBrokenDetailsError", { error: sm.fetchError })
        : t("findSitemapBrokenDetails"),
    });
  }

  const out: RobotsResult = { ok: true, robotsUrl, robotsContent, sitemaps, issues };
  await recordToolRun({
    toolId: "robots",
    label: t("runLabel", {
      origin,
      sitemaps: sitemaps.length,
      issues: issues.length,
    }),
    clientId: clientId ?? null,
    input: { url: rawUrl, clientId },
    result: out,
    findings,
  });
  return out;
}

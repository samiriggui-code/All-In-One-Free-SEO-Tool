/**
 * The specification of a redesign ("cahier des charges"), built from the
 * project's full audit.
 *
 * A redesign is where a site loses its rankings: pages renamed without a
 * redirect, titles and descriptions left blank in the new templates, a
 * heavier front end that fails Core Web Vitals. The agency sells the
 * redesign after the audit, so the audit already knows what the new site
 * must keep (the pages Google has), what it must fix (the findings) and
 * where it must land (the scores). This puts that in a document the
 * developers and the client can sign off on.
 *
 * Pure: no database, no React, no words. The texts are in messages
 * (`redesignSpec`), so the page and the Markdown export say the same thing.
 */

export type SpecSeverity = "critical" | "high" | "medium" | "low";

export type SpecInput = {
  project: { name: string; url: string };
  mission: { title: string; targetStack: string | null; notes: string | null };
  audit: {
    id: number;
    at: Date;
    mode: "quick" | "full" | null;
    score: number | null;
    pagesCrawled: number | null;
  } | null;
  /** Category scores of the engine, 0–100. */
  categories: { id: string; score: number }[];
  /** Pages the audit read. */
  pages: string[];
  /** Core Web Vitals measured by the audit, null when not measured. */
  cwv: { lcp: number | null; cls: number | null; inp: number | null } | null;
  /** Open findings of the audit. Infrastructure URLs already removed. */
  issues: { type: string; severity: SpecSeverity; url: string }[];
};

export type MustFix = {
  type: string;
  severity: SpecSeverity;
  /** Distinct pages, at most 10. */
  pages: string[];
  pageCount: number;
};

/** Standard requirements of any redesign; `failing` when the audit found the problem. */
export const REQUIREMENTS = [
  { id: "https", types: ["no_https", "seomator:security-https-redirect", "seomator:security-https"] },
  { id: "titles", types: ["missing_title", "short_title", "long_title", "seomator:core-title-unique", "seomator:core-title-present", "seomator:core-title-length"] },
  {
    id: "descriptions",
    types: ["missing_meta_description", "short_meta_description", "long_meta_description", "seomator:content-duplicate-description"],
  },
  { id: "headings", types: ["missing_h1", "seomator:content-heading-hierarchy", "seomator:js-rendered-h1"] },
  { id: "canonical", types: ["missing_canonical", "seomator:js-rendered-canonical"] },
  { id: "indexing", types: ["noindex_set", "missing_robots_txt", "missing_sitemap", "invalid_robots_txt"] },
  { id: "structuredData", types: ["missing_schema"] },
  { id: "mobile", types: ["missing_viewport"] },
  { id: "language", types: ["missing_lang"] },
  { id: "images", types: ["missing_image_alt"] },
  {
    id: "social",
    types: ["missing_og_tags", "missing_favicon", "seomator:social-og-url", "seomator:social-og-image-size", "seomator:social-og-image"],
  },
  { id: "errors", types: ["bad_status", "broken_link", "redirect_chain", "seomator:technical-404-page", "seomator:technical-www-redirect"] },
  {
    id: "security",
    types: ["missing_security_headers", "seomator:security-csp", "seomator:security-coop", "seomator:security-permissions-policy"],
  },
  { id: "content", types: ["thin_content"] },
] as const;

export type RequirementId = (typeof REQUIREMENTS)[number]["id"];

/** Checks before going live, then after. Ids only; texts in messages. */
export const CHECKS_BEFORE = ["redirects", "noindexStaging", "titlesFilled", "sitemapReady", "cwvStaging", "analytics"] as const;
export const CHECKS_AFTER = ["auditNew", "searchConsole", "redirectsLive", "trafficWatch", "rankWatch"] as const;

/** Core Web Vitals targets ("good" thresholds). LCP and INP in ms. */
export const CWV_TARGETS = { lcp: 2500, cls: 0.1, inp: 200 } as const;

/** Category scores below this go into "where the new site must do better". */
export const WEAK_CATEGORY = 80;

/** The score the new site must reach, and at least the current one plus ten. */
export function targetScore(current: number | null): number {
  if (current === null) return 80;
  return Math.min(100, Math.max(80, current + 10));
}

const RANK: Record<SpecSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export type RedesignSpec = {
  project: SpecInput["project"];
  mission: SpecInput["mission"];
  audit: SpecInput["audit"];
  targetScore: number;
  weakCategories: { id: string; score: number }[];
  /** Pages to keep or redirect: every page the audit read, sorted, unique. */
  pages: string[];
  mustFix: MustFix[];
  requirements: { id: RequirementId; failing: boolean }[];
  cwv: { metric: "lcp" | "cls" | "inp"; current: number | null; target: number; ok: boolean | null }[];
};

export function buildRedesignSpec(input: SpecInput): RedesignSpec {
  const byType = new Map<string, { severity: SpecSeverity; urls: Set<string> }>();
  for (const i of input.issues) {
    if (i.severity === "low") continue;
    const g = byType.get(i.type) ?? { severity: i.severity, urls: new Set<string>() };
    if (RANK[i.severity] < RANK[g.severity]) g.severity = i.severity;
    g.urls.add(i.url);
    byType.set(i.type, g);
  }
  const mustFix = [...byType.entries()]
    .map(([type, g]) => ({
      type,
      severity: g.severity,
      pages: [...g.urls].slice(0, 10),
      pageCount: g.urls.size,
    }))
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.pageCount - a.pageCount || a.type.localeCompare(b.type));

  const found = new Set(mustFix.map((m) => m.type));
  const metric = (m: "lcp" | "cls" | "inp") => {
    const current = input.cwv?.[m] ?? null;
    return { metric: m, current, target: CWV_TARGETS[m], ok: current === null ? null : current <= CWV_TARGETS[m] };
  };

  return {
    project: input.project,
    mission: input.mission,
    audit: input.audit,
    targetScore: targetScore(input.audit?.score ?? null),
    weakCategories: input.categories.filter((c) => c.score < WEAK_CATEGORY).sort((a, b) => a.score - b.score),
    pages: redirectPages(input.pages),
    mustFix,
    requirements: REQUIREMENTS.map((r) => ({
      id: r.id,
      failing: r.types.some((t) => found.has(t)),
    })),
    cwv: [metric("lcp"), metric("cls"), metric("inp")],
  };
}

/**
 * The pages of the redirect plan: one per address (with or without the
 * trailing slash, which servers treat as the same page), and no files the
 * new site regenerates (robots.txt, sitemaps), which are not pages.
 */
export function redirectPages(urls: readonly string[]): string[] {
  const byKey = new Map<string, string>();
  for (const u of urls) {
    if (!u) continue;
    const path = pathOf(u);
    if (/^\/(robots\.txt|sitemap[^/]*\.xml|favicon\.ico)$/i.test(path.split("?")[0])) continue;
    let key = u;
    try {
      const x = new URL(u);
      key = (x.host + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase();
    } catch {
      // Not a URL: keep it as it is.
    }
    if (!byKey.has(key)) byKey.set(key, u);
  }
  return [...byKey.values()].sort((a, b) => pathOf(a).localeCompare(pathOf(b)));
}

/** "https://site.fr/a/b?x" → "/a/b?x"; the homepage reads "/". */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname || "/") + u.search;
  } catch {
    return url;
  }
}

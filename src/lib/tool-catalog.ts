/**
 * The tool catalogue shown in Settings → Tools: every page that is a tool,
 * grouped by the kind of mission it serves in an SEO agency.
 *
 * It replaces two classifications that sat on /tools at once: the eleven
 * numbered workflow groups of the old sidebar (nav-items.ts) and the six
 * "jobs" of the tools grid (tool-categories.ts). Each tool belonged to one
 * group in the first and to another in the second, and most were in only
 * one of the two. Here every tool has one place, and pages that no menu
 * listed (content gap, AI bot logs, brand SERP…) get one too.
 *
 * Client-safe: plain data, no DB.
 */

export type MissionCategoryId =
  | "prospecting"
  | "setup"
  | "audit"
  | "strategy"
  | "content"
  | "links"
  | "local"
  | "ai"
  | "ads"
  | "reporting"
  | "special"
  | "agency";

/** Render order, following an engagement from first contact to follow-up. */
export const MISSION_CATEGORIES: MissionCategoryId[] = [
  "prospecting",
  "setup",
  "audit",
  "strategy",
  "content",
  "links",
  "local",
  "ai",
  "ads",
  "reporting",
  "special",
  "agency",
];

/** An integration that has to be connected before the tool has data. */
export type CatalogNeed = "gsc";

export type CatalogEntry = {
  href: string;
  category: MissionCategoryId;
  needs?: CatalogNeed;
};

const gsc = "gsc" as const;

export const TOOL_CATALOG: CatalogEntry[] = [
  // Prospection & vente
  { href: "/grader", category: "prospecting" },
  { href: "/compare", category: "prospecting" },
  { href: "/proposals", category: "prospecting" },
  { href: "/tools/domain-overview", category: "prospecting" },
  { href: "/tools/bulk-scan", category: "prospecting" },
  { href: "/tools/traffic-drop", category: "prospecting", needs: gsc },

  // Mise en place du client
  { href: "/connect", category: "setup" },
  { href: "/import", category: "setup" },
  { href: "/csv-import", category: "setup" },
  { href: "/tools/screenshot-import", category: "setup" },

  // Audit & diagnostic technique
  { href: "/tools/health-check", category: "audit" },
  { href: "/cwv", category: "audit" },
  { href: "/tools/crux", category: "audit" },
  { href: "/tools/local-cwv", category: "audit" },
  { href: "/tools/perf-budget", category: "audit" },
  { href: "/landing-perf", category: "audit" },
  { href: "/broken-links", category: "audit" },
  { href: "/tools/link-checker", category: "audit" },
  { href: "/tools/redirects-manager", category: "audit" },
  { href: "/tools/soft-404", category: "audit" },
  { href: "/tools/canonical-audit", category: "audit" },
  { href: "/tools/headers", category: "audit" },
  { href: "/tools/security", category: "audit" },
  { href: "/tools/wp-hack-scan", category: "audit" },
  { href: "/tools/mobile-friendly", category: "audit" },
  { href: "/tools/render", category: "audit" },
  { href: "/tools/facet-trap", category: "audit" },
  { href: "/tools/robots", category: "audit" },
  { href: "/tools/sitemap", category: "audit" },
  { href: "/tools/gsc-coverage", category: "audit", needs: gsc },
  { href: "/tools/indexnow", category: "audit" },
  { href: "/cannibalization", category: "audit" },
  { href: "/tools/cannibalization", category: "audit", needs: gsc },
  { href: "/image-audit", category: "audit" },

  // Mots-clés & stratégie
  { href: "/keywords", category: "strategy" },
  { href: "/competitors", category: "strategy" },
  { href: "/content-gap", category: "strategy" },
  { href: "/serp-scans", category: "strategy" },
  { href: "/tools/rank-where", category: "strategy" },
  { href: "/tools/search-volume", category: "strategy" },
  { href: "/tools/keyword-difficulty", category: "strategy" },
  { href: "/tools/intent-classifier", category: "strategy" },
  { href: "/tools/cluster", category: "strategy" },
  { href: "/tools/serp-features", category: "strategy" },
  { href: "/tools/branded-split", category: "strategy", needs: gsc },
  { href: "/tools/trending", category: "strategy" },
  { href: "/tools/youtube", category: "strategy" },

  // Contenu & optimisation des pages
  { href: "/content", category: "content" },
  { href: "/tools/content-grader", category: "content" },
  { href: "/tools/content-score", category: "content" },
  { href: "/tools/refresh", category: "content" },
  { href: "/tools/freshness", category: "content" },
  { href: "/tools/eeat-audit", category: "content" },
  { href: "/tools/sxo", category: "content" },
  { href: "/title-tests", category: "content" },
  { href: "/meta-rewrite", category: "content" },
  { href: "/tools/meta-tag-generator", category: "content" },
  { href: "/tools/schema", category: "content" },
  { href: "/tools/person-schema", category: "content" },
  { href: "/author-authority", category: "content" },
  { href: "/tools/bulk-alt", category: "content" },
  { href: "/tools/social-preview", category: "content" },
  { href: "/tools/og-image", category: "content" },
  { href: "/tools/image-gen", category: "content" },
  { href: "/tools/content-helpers", category: "content" },
  { href: "/tools/summarizer", category: "content" },
  { href: "/tools/plagiarism", category: "content" },
  { href: "/tools/news-headline", category: "content" },
  { href: "/tools/youtube-audit", category: "content" },

  // Netlinking & maillage
  { href: "/backlinks", category: "links" },
  { href: "/tools/backlink-discovery", category: "links" },
  { href: "/tools/link-intersect", category: "links" },
  { href: "/tools/anchor-distribution", category: "links" },
  { href: "/link-building", category: "links" },
  { href: "/outreach", category: "links" },
  { href: "/tools/outreach-personalize", category: "links" },
  { href: "/tools/disavow", category: "links" },
  { href: "/tools/internal-linking", category: "links" },
  { href: "/tools/link-graph", category: "links" },
  { href: "/tools/pagerank", category: "links" },

  // SEO local
  { href: "/gbp", category: "local" },
  { href: "/tools/gbp-reply", category: "local" },
  { href: "/citations", category: "local" },
  { href: "/local-rank", category: "local" },
  { href: "/local-grid", category: "local" },

  // Visibilité IA (GEO)
  { href: "/ai-visibility", category: "ai" },
  { href: "/tools/geo-score", category: "ai" },
  { href: "/tools/geo-swot", category: "ai" },
  { href: "/tools/ai-overview", category: "ai" },
  { href: "/tools/aio-passage", category: "ai" },
  { href: "/tools/ai-citation-tactics", category: "ai" },
  { href: "/tools/ai-schema", category: "ai" },
  { href: "/tools/llms-txt", category: "ai" },
  { href: "/tools/ai-robots", category: "ai" },
  { href: "/bot-logs", category: "ai" },
  { href: "/tools/reddit-research", category: "ai" },
  { href: "/tools/reputation-abuse-risk", category: "ai" },

  // Publicité
  { href: "/tools/ads-funnel", category: "ads" },
  { href: "/tools/utm-attribution", category: "ads" },

  // Suivi & reporting
  { href: "/reports/batch", category: "reporting" },
  { href: "/reports/archive", category: "reporting" },
  { href: "/report-data", category: "reporting" },
  { href: "/digest", category: "reporting" },
  { href: "/monitor", category: "reporting" },
  { href: "/snapshots", category: "reporting" },
  { href: "/tools/uptime", category: "reporting" },
  { href: "/tools/serp-volatility", category: "reporting" },
  { href: "/brand-monitor", category: "reporting" },
  { href: "/brand-serp", category: "reporting" },
  { href: "/knowledge-panel", category: "reporting" },
  { href: "/tools/bing", category: "reporting" },
  { href: "/annotations", category: "reporting" },
  { href: "/algorithm-updates", category: "reporting" },
  { href: "/news", category: "reporting" },

  // Projets spéciaux : migrations, international, développement
  { href: "/tools/migration-map", category: "special" },
  { href: "/tools/migration-parity", category: "special" },
  { href: "/tools/hreflang", category: "special" },
  { href: "/tools/programmatic-seo", category: "special" },
  { href: "/tools/code-generator", category: "special" },
  { href: "/tools/github-pr", category: "special" },
  { href: "/tools/browser-agent", category: "special" },
  { href: "/tools/dns-whois", category: "special" },
  { href: "/tools/wayback", category: "special" },
  { href: "/tools/external", category: "special" },

  // Cabinet & automatisation
  { href: "/morning", category: "agency" },
  { href: "/agent", category: "agency" },
  { href: "/agent/autopilot", category: "agency" },
  { href: "/automations", category: "agency" },
  { href: "/capacity", category: "agency" },
  { href: "/activity", category: "agency" },
  { href: "/invoices", category: "agency" },
  { href: "/history", category: "agency" },
  { href: "/chats", category: "agency" },
  { href: "/ask", category: "agency" },
  { href: "/capture", category: "agency" },
  { href: "/links", category: "agency" },
  { href: "/knowledge", category: "agency" },
];

const BY_HREF = new Map(TOOL_CATALOG.map((e) => [e.href, e]));

export function catalogEntry(href: string): CatalogEntry | null {
  return BY_HREF.get(href.split(/[?#]/)[0]) ?? null;
}

/**
 * Is this link turned off? Matches the tool's own page and its per-client
 * view (/tools/geo-swot/c/4), so one switch covers both ways of reaching
 * it. Other sub-pages are tools of their own: turning off /agent leaves
 * /agent/autopilot alone.
 */
export function isToolDisabled(href: string, disabled: ReadonlySet<string>): boolean {
  if (disabled.size === 0) return false;
  const route = href.split(/[?#]/)[0];
  for (const d of disabled) {
    if (route === d || route.startsWith(d + "/c/")) return true;
  }
  return false;
}

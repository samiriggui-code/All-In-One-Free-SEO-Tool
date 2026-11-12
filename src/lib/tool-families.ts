/**
 * Tools that do one job from several angles, shown as one tool with tabs.
 *
 * The audit of the catalogue (12 Nov 2026) found 68 of 137 tools
 * overlapping: four views of page speed, three JSON-LD generators, four
 * readings of the same internal-link crawl… Each family below is one card
 * in Settings → Tools and one page with a tab per member. Every member
 * keeps its route and all it does; only the number of things to choose
 * between goes down.
 *
 * The first member is the family's entry: its href is the one the
 * catalogue lists and the one the on/off switch is stored under.
 *
 * Client-safe: plain data.
 */

export type ToolFamily = {
  /** Message key: toolFamilies.<id>.title and .tabs.<tab>. */
  id: string;
  members: readonly { href: string; tab: string }[];
};

const family = (id: string, ...members: [href: string, tab: string][]): ToolFamily => ({
  id,
  members: members.map(([href, tab]) => ({ href, tab })),
});

export const TOOL_FAMILIES: readonly ToolFamily[] = [
  family(
    "auditExpress",
    ["/tools/health-check", "one"],
    ["/tools/bulk-scan", "bulk"],
    ["/grader", "prospect"],
    ["/tools/domain-overview", "domain"],
  ),
  family("import", ["/import", "any"], ["/csv-import", "csv"], ["/tools/screenshot-import", "screenshot"]),
  family(
    "performance",
    ["/cwv", "tracking"],
    ["/tools/crux", "field"],
    ["/tools/local-cwv", "lab"],
    ["/tools/perf-budget", "budgets"],
    ["/tools/crux-origin", "origin"],
    ["/cwv/archive", "archive"],
  ),
  // The seven checks the site audit also runs on every crawl. Kept as
  // one tool for looking at a single page or digging further; the family
  // carries a note that sends back to the audit (toolFamilies.auditChecks.note).
  family(
    "auditChecks",
    ["/tools/canonical-audit", "canonical"],
    ["/tools/soft-404", "soft404"],
    ["/tools/facet-trap", "facets"],
    ["/tools/mobile-friendly", "mobile"],
    ["/image-audit", "images"],
    ["/tools/security", "security"],
    ["/tools/freshness", "freshness"],
  ),
  family("brokenLinks", ["/broken-links", "site"], ["/tools/link-checker", "page"]),
  family("render", ["/tools/render", "render"], ["/tools/headers", "headers"]),
  family(
    "robots",
    ["/tools/robots", "search"],
    ["/tools/ai-robots", "ai"],
    ["/tools/robots-history", "history"],
  ),
  family("redirects", ["/tools/redirects-manager", "manager"], ["/tools/redirects-bulk", "bulk"]),
  family("cannibalization", ["/tools/cannibalization", "analysis"], ["/cannibalization", "clients"]),
  family("competitors", ["/competitors", "tracked"], ["/competitors/playbook", "playbook"]),
  family("keywords", ["/keywords", "tracked"], ["/serp-scans", "serps"]),
  family(
    "keywordResearch",
    ["/tools/search-volume", "volume"],
    ["/tools/keyword-difficulty", "difficulty"],
    ["/tools/intent-classifier", "intent"],
  ),
  family(
    "studio",
    ["/content", "studio"],
    ["/tools/content-grader", "serpScore"],
    ["/tools/content-score", "aiScore"],
    ["/tools/refresh", "refresh"],
    ["/tools/summarizer", "summary"],
    ["/tools/content-helpers", "helpers"],
  ),
  family(
    "meta",
    ["/tools/meta-tag-generator", "one"],
    ["/meta-rewrite", "bulk"],
    ["/tools/pixel-preview", "pixels"],
  ),
  family(
    "schema",
    ["/tools/schema", "generator"],
    ["/tools/ai-schema", "fromUrl"],
    ["/tools/person-schema", "person"],
    ["/tools/schema-validate", "validate"],
  ),
  family("eeat", ["/tools/eeat-audit", "page"], ["/author-authority", "authors"]),
  family("social", ["/tools/social-preview", "preview"], ["/tools/og-image", "image"]),
  family(
    "backlinks",
    ["/backlinks", "profile"],
    ["/tools/backlink-discovery", "discovery"],
    ["/tools/link-intersect", "intersect"],
  ),
  family(
    "internalLinks",
    ["/tools/internal-linking", "opportunities"],
    ["/tools/link-graph", "orphans"],
    ["/tools/pagerank", "pagerank"],
    ["/tools/anchor-distribution", "anchors"],
    ["/tools/link-recommender", "recommend"],
    ["/tools/auto-link", "auto"],
  ),
  family("localRank", ["/local-rank", "list"], ["/local-grid", "map"]),
  family("aiOverviews", ["/tools/ai-overview", "page"], ["/tools/aio-passage", "passages"]),
  family(
    "reports",
    ["/reports/batch", "generate"],
    ["/report-data", "add"],
    ["/reports/archive", "archive"],
  ),
  family("watch", ["/monitor", "changes"], ["/tools/uptime", "uptime"], ["/snapshots", "snapshots"]),
  family(
    "brand",
    ["/brand-monitor", "mentions"],
    ["/brand-serp", "serp"],
    ["/knowledge-panel", "panel"],
  ),
  family(
    "googleWatch",
    ["/algorithm-updates", "updates"],
    ["/tools/serp-volatility", "volatility"],
    ["/news", "news"],
  ),
  family("hreflang", ["/tools/hreflang", "audit"], ["/tools/hreflang-gen", "generator"]),
  family("migration", ["/tools/migration-map", "plan"], ["/tools/migration-parity", "check"]),
  family("fixes", ["/tools/code-generator", "code"], ["/tools/github-pr", "pr"]),
  family("agent", ["/agent", "agent"], ["/agent/autopilot", "autopilot"]),
  family("journal", ["/activity", "activity"], ["/history", "runs"]),
  family("ask", ["/ask", "ask"], ["/chats", "history"]),
];

type Hit = { family: ToolFamily; member: ToolFamily["members"][number] };

const MEMBERS: Hit[] = TOOL_FAMILIES.flatMap((f) => f.members.map((member) => ({ family: f, member })))
  // Longest first, so /agent/autopilot is not taken for a sub-page of /agent.
  .sort((a, b) => b.member.href.length - a.member.href.length);

/**
 * The family a route belongs to, and which member it is. Sub-pages count
 * (/backlinks/c/4 is the backlinks profile), other tools that merely share
 * a prefix do not (/content-gap is not the studio).
 */
export function familyOf(route: string): Hit | null {
  const path = route.split(/[?#]/)[0];
  return (
    MEMBERS.find(({ member }) => path === member.href || path.startsWith(member.href + "/")) ?? null
  );
}

/** The href a tool is catalogued and switched on or off under. */
export function familyEntry(route: string): string | null {
  return familyOf(route)?.family.members[0].href ?? null;
}

/**
 * Family members that have a page of their own inside a project
 * (`<href>/c/<id>`). From a project, their tab opens that page; the other
 * members are opened with the project in the address (`?clientId=`), so
 * no tab leads out of the project. tool-catalog.test.ts checks this list
 * against the pages that exist.
 */
export const PROJECT_VIEWS: ReadonlySet<string> = new Set([
  "/cwv",
  "/broken-links",
  "/image-audit",
  "/cannibalization",
  "/competitors",
  "/keywords",
  "/content",
  "/meta-rewrite",
  "/backlinks",
  "/local-rank",
  "/local-grid",
  "/monitor",
  "/brand-monitor",
  "/agent",
]);

/**
 * Where a family tab leads. Outside a project: the member's own page.
 * Inside one: the member's page for that project, or the tool opened for
 * it, with the site's address when it is known so the form is not empty.
 */
export function familyTabHref(
  href: string,
  project: { id: number; url?: string | null } | null,
): string {
  if (!project) return href;
  if (PROJECT_VIEWS.has(href)) return `${href}/c/${project.id}`;
  const qs = new URLSearchParams({ clientId: String(project.id) });
  if (project.url) qs.set("url", project.url);
  return `${href}?${qs.toString()}`;
}

/** The project a route is about: `/x/c/12/...` or `/clients/12/...`. */
export function projectIdOfRoute(route: string): number | null {
  const m = /\/c\/(\d+)(?:\/|$)/.exec(route) ?? /^\/clients\/(\d+)(?:\/|$)/.exec(route);
  return m ? Number(m[1]) : null;
}

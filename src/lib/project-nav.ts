/**
 * The tabs of a project and the pages each one holds.
 *
 * The per-client pages (/audits/c/12, /keywords/c/12, …) were reached from
 * some 120 links and each opened on its own, with an "All clients" header
 * that led out of the project. They are grouped here into the project's
 * tabs; the URLs stay as they are. Drawn by components/shell/project-nav.tsx
 * from the client-scope layout, so every per-client page gets it.
 *
 * Pure: no database, no React. `:id` stands for the project id.
 */

import type { MissionKind, MissionStatus } from "./mission-kinds";

export const PROJECT_GROUPS = [
  "overview",
  "audit",
  "keywords",
  "links",
  "local",
  "ai",
  "reports",
  "missions",
  "settings",
] as const;
export type ProjectGroup = (typeof PROJECT_GROUPS)[number];

/** One page of a tab. `key` names it in messages (projectNav.pages). */
export type ProjectPage = { key: string; href: string };

const PAGES: Record<ProjectGroup, readonly ProjectPage[]> = {
  overview: [
    { key: "overview", href: "/clients/:id" },
    { key: "agent", href: "/agent/c/:id" },
  ],
  audit: [
    { key: "audits", href: "/audits/c/:id" },
    { key: "findings", href: "/findings/c/:id" },
    { key: "monitor", href: "/monitor/c/:id" },
    { key: "cwv", href: "/cwv/c/:id" },
    { key: "landingPerf", href: "/landing-perf/c/:id" },
    { key: "brokenLinks", href: "/broken-links/c/:id" },
    { key: "images", href: "/image-audit/c/:id" },
  ],
  keywords: [
    { key: "keywords", href: "/keywords/c/:id" },
    { key: "cannibalization", href: "/cannibalization/c/:id" },
    { key: "competitors", href: "/competitors/c/:id" },
    { key: "contentGap", href: "/content-gap/c/:id" },
    { key: "content", href: "/content/c/:id" },
    { key: "metaRewrite", href: "/meta-rewrite/c/:id" },
  ],
  links: [
    { key: "backlinks", href: "/backlinks/c/:id" },
    { key: "linkBuilding", href: "/link-building/c/:id" },
    { key: "outreach", href: "/outreach/c/:id" },
    { key: "guestPosts", href: "/guest-posts/c/:id" },
  ],
  local: [
    { key: "gbp", href: "/gbp/c/:id" },
    { key: "citations", href: "/citations/c/:id" },
    { key: "localGrid", href: "/local-grid/c/:id" },
    { key: "localRank", href: "/local-rank/c/:id" },
  ],
  ai: [
    { key: "aiVisibility", href: "/ai-visibility/c/:id" },
    { key: "brandMonitor", href: "/brand-monitor/c/:id" },
    { key: "geoSwot", href: "/tools/geo-swot/c/:id" },
    { key: "knowledge", href: "/knowledge/c/:id" },
  ],
  reports: [{ key: "reports", href: "/reports/c/:id" }],
  missions: [{ key: "missions", href: "/clients/:id?tab=missions" }],
  settings: [{ key: "settings", href: "/clients/:id?tab=settings" }],
};

/**
 * A local business: one with an address or an area it serves, whose
 * customers find it on Google Maps. The Local tab (Business Profile, local
 * ranks, citations) means nothing for anyone else, so it is hidden unless
 * the project says it is local (niche) or has a Business Profile.
 */
export function isLocalProject(p: { niche: string | null; gbpUrl: string | null }): boolean {
  return p.niche === "local" || Boolean(p.gbpUrl?.trim());
}

/**
 * A tab outside what was sold is `secondary`: still there, behind "Other
 * tools", so the bar shows the work of this project first.
 */
export type ProjectTab = { group: ProjectGroup; href: string; pages: ProjectPage[]; secondary: boolean };

/** Every project has these: it starts with its audit and ends with a report. */
const ALWAYS: readonly ProjectGroup[] = ["overview", "audit", "reports", "missions", "settings"];

/**
 * The tabs each kind of mission works in, on top of ALWAYS. "other" is a
 * mission the app knows nothing about, so it hides nothing.
 */
const GROUPS_BY_MISSION: Record<MissionKind, readonly ProjectGroup[]> = {
  audit: [],
  monitoring: ["keywords", "local"],
  redesign: ["keywords"],
  full: ["keywords", "links", "local", "ai"],
  other: ["keywords", "links", "local", "ai"],
};

/** Missions that shape the project: agreed or on offer (as in project-tools.ts). */
const LIVE: ReadonlySet<MissionStatus> = new Set<MissionStatus>(["active", "proposed"]);

/** The tabs put forward for these missions. With none, the audit's. */
export function primaryGroups(
  missions: ReadonlyArray<{ kind: MissionKind; status: MissionStatus }>,
): Set<ProjectGroup> {
  const groups = new Set<ProjectGroup>(ALWAYS);
  for (const m of missions) {
    if (!LIVE.has(m.status)) continue;
    for (const g of GROUPS_BY_MISSION[m.kind]) groups.add(g);
  }
  return groups;
}

export function projectTabs(
  projectId: number,
  opts: { local: boolean; missions?: ReadonlyArray<{ kind: MissionKind; status: MissionStatus }> },
): ProjectTab[] {
  const fill = (href: string) => href.replace(":id", String(projectId));
  // Callers that do not know the missions get every tab, as before.
  const primary = opts.missions ? primaryGroups(opts.missions) : null;
  return PROJECT_GROUPS.filter((g) => g !== "local" || opts.local).map((group) => {
    const pages = PAGES[group].map((p) => ({ key: p.key, href: fill(p.href) }));
    return { group, href: pages[0].href, pages, secondary: primary !== null && !primary.has(group) };
  });
}

/**
 * Which tab and page a URL is. `tab` is the project page's ?tab= value.
 * Sub-pages count as their parent (/content/c/12/p/3 is the writing studio,
 * /gbp/c/12/reviews the Business Profile), and /clients/12/onboarding and
 * the like as the overview. Null when the path is no project page at all.
 */
export function activeProjectPage(
  pathname: string,
  tab: string | null,
  projectId: number,
): { group: ProjectGroup; key: string } | null {
  const id = String(projectId);
  if (pathname === `/clients/${id}` || pathname.startsWith(`/clients/${id}/`)) {
    if (pathname === `/clients/${id}` && (tab === "missions" || tab === "settings")) {
      return { group: tab, key: tab };
    }
    // A mission's own pages (the redesign specification) belong to Missions.
    if (pathname.startsWith(`/clients/${id}/missions/`)) return { group: "missions", key: "missions" };
    return { group: "overview", key: "overview" };
  }
  for (const group of PROJECT_GROUPS) {
    for (const p of PAGES[group]) {
      const base = p.href.replace(":id", id).split("?")[0];
      if (base.startsWith("/clients/")) continue;
      if (pathname === base || pathname.startsWith(base + "/")) return { group, key: p.key };
    }
  }
  return null;
}

/** Every per-client page the tabs link to, for the test that checks each exists. */
export function allProjectPageHrefs(): string[] {
  return PROJECT_GROUPS.flatMap((g) => PAGES[g].map((p) => p.href));
}

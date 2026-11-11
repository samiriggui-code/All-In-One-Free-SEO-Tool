/**
 * Which tools a project page puts forward.
 *
 * The rail used to list forty tools on every project. Most of them have
 * nothing to do with what was sold: a site under monitoring does not need
 * the schema generator, a redesign does not need the backlink hub. This
 * picks three to five, from the tab being read and the project's missions.
 * The forty stay one click away (the rail's "All tools" and its search):
 * this decides what is shown first, not what can be used.
 *
 * Pure: no database, no React. Tools are named by their path with the
 * project id replaced by ":id" (see toolKey), so the tables below read
 * like the links they stand for.
 */
import type { MissionKind, MissionStatus } from "./mission-kinds";

export type ProjectToolsTab = "overview" | "missions" | "settings";

/** At most this many tools are put forward. */
export const FEATURED_MAX = 5;

/** Missions that shape the page: agreed or on offer. Paused, done and cancelled do not. */
const LIVE: ReadonlySet<MissionStatus> = new Set<MissionStatus>(["active", "proposed"]);

/**
 * Overview tab, by mission. First tools first: when a project has several
 * missions, each one's list is taken in turn, so every mission gets its
 * most useful tool before any gets its third.
 */
const BY_MISSION: Record<MissionKind | "none", readonly string[]> = {
  // Nothing sold yet: every project starts with its audit (lib/missions.ts).
  none: ["/audits", "/tools/health-check", "/tools/local-cwv", "/reports"],
  audit: ["/audits", "/tools/health-check", "/tools/local-cwv", "/tools/security", "/reports"],
  monitoring: ["/keywords", "/tools/rank-where", "/tools/traffic-drop", "/reports", "/audits"],
  full: ["/keywords", "/content/c/:id", "/tools/internal-linking", "/backlinks", "/reports"],
  // Before and after checks for the new site.
  redesign: ["/audits", "/tools/render", "/tools/local-cwv", "/tools/robots", "/tools/schema"],
  other: ["/audits", "/reports"],
};

/** The other tabs do not depend on the missions. */
const BY_TAB: Record<Exclude<ProjectToolsTab, "overview">, readonly string[]> = {
  // Building or reviewing what is sold rests on the audit and the report.
  missions: ["/audits", "/reports", "/clients/:id/onboarding"],
  // How the project is connected and crawled.
  settings: ["/clients/:id/onboarding", "/tools/robots", "/tools/ai-robots", "/tools/security"],
};

/** "/content/c/12?x=1" for project 12 -> "/content/c/:id". */
export function toolKey(href: string, projectId: number): string {
  const path = href.split(/[?#]/)[0];
  return path
    .split("/")
    .map((seg) => (seg === String(projectId) ? ":id" : seg))
    .join("/");
}

export function featuredToolKeys(
  tab: ProjectToolsTab,
  missions: ReadonlyArray<{ kind: MissionKind; status: MissionStatus }>,
): string[] {
  if (tab !== "overview") return BY_TAB[tab].slice(0, FEATURED_MAX);

  const kinds = [...new Set(missions.filter((m) => LIVE.has(m.status)).map((m) => m.kind))];
  const lists = kinds.length > 0 ? kinds.map((k) => BY_MISSION[k]) : [BY_MISSION.none];

  const picked: string[] = [];
  const longest = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < longest && picked.length < FEATURED_MAX; i++) {
    for (const list of lists) {
      const key = list[i];
      if (key && !picked.includes(key)) picked.push(key);
      if (picked.length === FEATURED_MAX) break;
    }
  }
  return picked;
}

/** Every key the tables above can return, for the test that checks each one exists. */
export function allFeaturedKeys(): string[] {
  return [...new Set([...Object.values(BY_MISSION), ...Object.values(BY_TAB)].flat())];
}

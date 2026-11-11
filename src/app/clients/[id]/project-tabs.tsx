/**
 * Which part of the project page is open (?tab=). The tabs themselves are
 * drawn by the project navigation on every page of the project
 * (components/shell/project-nav.tsx, lib/project-nav.ts).
 */
export const PROJECT_TABS = ["overview", "missions", "settings"] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export function parseProjectTab(raw: string | string[] | undefined): ProjectTab {
  return (PROJECT_TABS as readonly string[]).includes(String(raw)) ? (raw as ProjectTab) : "overview";
}

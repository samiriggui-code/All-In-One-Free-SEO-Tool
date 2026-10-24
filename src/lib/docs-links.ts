/**
 * Which part of the in-app docs explains which screen.
 *
 * The help button used to open an external handbook, in English, on
 * someone else's site. The guides at /docs are the ones kept up to date
 * with the app and translated, so the button now lands there.
 *
 * One map, for the same reason the GitHub slug is one constant: a docs
 * link written inline in a dozen components is a dozen links to fix when
 * a guide is renamed.
 */

/** The docs home, where every guide and every tool is listed. */
export const DOCS_HOME = "/docs";

/**
 * Route prefix → docs page: a guide (/docs/<slug>) or a section of the
 * docs home (/docs#<anchor>).
 *
 * Longest prefix wins, so "/settings/backup" can differ from "/settings"
 * without the order of this object mattering.
 */
const ROUTE_DOCS: Record<string, string> = {
  "/welcome": "/docs/first-client",
  "/clients": "/docs/first-client",
  "/audits": "/docs/audit",
  "/grader": "/docs/audit",
  "/broken-links": "/docs/audit",
  "/tasks": "/docs/audit",
  "/morning": "/docs/audit",
  "/keywords": "/docs/keywords",
  "/cannibalization": "/docs/keywords",
  "/serp-scans": "/docs/keywords",
  "/content": "/docs/write-article",
  "/proposals": "/docs/client-report",
  "/reports": "/docs/monthly-report",
  "/connect": "/docs/connect-chat-app",
  "/settings": "/docs/connect-ai",
  "/settings/backup": "/docs/update-backup",
  "/tools": "/docs#tools",
};

/** The docs page for a screen, or the docs home when nothing matches. */
export function docsUrlFor(pathname: string | null | undefined): string {
  const path = (pathname ?? "/").split("?")[0].replace(/\/+$/, "") || "/";

  // A single tool has its own entry in the reference list.
  const tool = /^\/tools\/([^/]+)$/.exec(path);
  if (tool) return `${DOCS_HOME}#${tool[1]}`;

  let best = "";
  for (const prefix of Object.keys(ROUTE_DOCS)) {
    if ((path === prefix || path.startsWith(prefix + "/")) && prefix.length > best.length) {
      best = prefix;
    }
  }

  return best ? ROUTE_DOCS[best] : DOCS_HOME;
}

/** Every page the map can produce, for the test that checks none is dead. */
export function mappedDocsPages(): string[] {
  return [...new Set(Object.values(ROUTE_DOCS))];
}

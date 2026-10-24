/**
 * What each role may open and change, by route.
 *
 *   owner   — everything.
 *   manager — every client and all the work; not the workspace's
 *             configuration (keys, integrations, backups, team).
 *   member  — the clients assigned to them; same limits as a manager.
 *   viewer  — a client contact: read-only, on a short list of pages,
 *             for the clients assigned to them.
 *
 * Which clients someone sees is decided on the Node side
 * (`visibleClientIds`, `assertClientAccess`), because only it can read
 * assignments. This file is the other half: the coarse rules that need
 * only the role, so middleware can apply them to every request,
 * including server actions and API routes that never check a role
 * themselves. Owner-only server actions also refuse on their own
 * (`assertOwner`), since an action id can be posted to any page.
 *
 * Edge-safe: no database, no Node APIs.
 */

import type { SessionRole } from "./session-token";

/** Workspace configuration and server administration. Owner only. */
export const OWNER_ONLY_PREFIXES = [
  "/settings/",
  "/api/backup",
  "/api/restore",
  "/api/update",
  "/api/restart",
  "/api/shutdown",
  "/api/desktop-shortcut",
  "/api/team",
  "/api/test-provider",
] as const;

/**
 * Pages a client viewer may open. Anything else redirects home: the
 * tools, the agent and the admin pages are the agency's workbench, not
 * the client's.
 */
export const VIEWER_PAGES = [
  "/",
  "/welcome",
  "/clients",
  "/audits",
  "/tasks",
  "/reports",
  "/keywords",
  "/morning",
  "/digest",
] as const;

/** Requests a viewer may still make that are not plain reads. */
const VIEWER_WRITE_ALLOWED = ["/api/auth/logout"] as const;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function under(pathname: string, prefix: string): boolean {
  if (prefix.endsWith("/")) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function isOwnerOnlyPath(pathname: string): boolean {
  return OWNER_ONLY_PREFIXES.some((p) => under(pathname, p));
}

export function isViewerPage(pathname: string): boolean {
  return VIEWER_PAGES.some((p) =>
    p === "/" ? pathname === "/" : under(pathname, p),
  );
}

export type RouteDecision = "allow" | "deny";

/**
 * May this role make this request?
 *
 * `deny` becomes a redirect home for a page load and a 403 for anything
 * else; see middleware.
 */
export function routeDecision(
  role: SessionRole,
  pathname: string,
  method: string,
): RouteDecision {
  if (role === "owner") return "allow";
  if (isOwnerOnlyPath(pathname)) return "deny";

  if (role === "viewer") {
    if (!SAFE_METHODS.has(method.toUpperCase())) {
      return VIEWER_WRITE_ALLOWED.some((p) => under(pathname, p))
        ? "allow"
        : "deny";
    }
    // API reads are scoped by client on the Node side; pages are not
    // all scoped, so viewers get the allow-list.
    if (pathname.startsWith("/api/")) return "allow";
    return isViewerPage(pathname) ? "allow" : "deny";
  }

  return "allow";
}

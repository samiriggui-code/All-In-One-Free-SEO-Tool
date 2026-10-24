/**
 * The sign-in screens: login, first-run owner setup, invited signup.
 *
 * They render in their own branded frame, not inside the app shell.
 * Drawing them inside the shell put the login card between a sidebar
 * and a top bar full of links to tools the visitor could not open yet,
 * and shipped the agency's whole navigation to someone who had not
 * signed in.
 *
 * Edge-safe: imported by middleware as well as the root layout.
 */

export const AUTH_PAGES = ["/login", "/register", "/invite"] as const;

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Request header carrying the pathname from middleware to the root layout. */
export const PATHNAME_HEADER = "x-pathname";

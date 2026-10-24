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

/**
 * Request header carrying the path plus query string, for the `next=`
 * the layout sends a signed-out visitor back to after login.
 */
export const RETURN_TO_HEADER = "x-return-to";

/**
 * Pages that are public by design and draw no shell: the client portal
 * (authenticated by its share token) and the embeddable grader. They are
 * the only pages a signed-out visitor may see with accounts on.
 * `?embed=1` hides the shell too, but it is a display switch any URL
 * can carry, so it must never stand in for this.
 */
// /accueil is the public landing page signed-out visitors land on.
const PUBLIC_PAGES = ["/portal", "/embed/grader", "/accueil"];

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

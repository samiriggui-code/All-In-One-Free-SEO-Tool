import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { accountsEnabled, currentUser } from "./auth";

/**
 * The account check every server action makes before doing anything.
 *
 * A server action is a POST with an action id to any page, and Next does
 * not check that the action belongs to that page. Action ids are in the
 * public JS bundles. Middleware closes most of that (it gates a
 * `next-action` POST on public paths too), but two gaps stay open
 * without a check in the action itself:
 *
 *   - the grader and the client portal must take their own actions
 *     signed out, and middleware cannot tell those ids from any other;
 *   - middleware only proves a session cookie is authentic. Whether its
 *     user still exists, is active and has the same role is only known
 *     here (`currentUser()`).
 *
 * Role rules stay where they were: viewers cannot POST at all
 * (middleware), owner-only actions call `requireSettingsAdmin()` or
 * `assertOwner()`, editing actions `requireEditor()`, and actions on one
 * client `requireClientAccess()`. This only answers "is there a valid sign-in".
 *
 * Code that calls an action as a plain function outside any request
 * (the background scheduler) has no cookies to check and is not an
 * HTTP caller, so it passes.
 */
export async function requireSignedIn(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Sign in to do this.");
}

/**
 * The same check without throwing, for the few reads the login page
 * also makes: they answer with a neutral value instead of failing.
 */
export async function isSignedIn(): Promise<boolean> {
  let jar: Awaited<ReturnType<typeof cookies>>;
  try {
    jar = await cookies();
  } catch (err) {
    // Only "no request here" means "not an HTTP caller". Anything else,
    // Next's own control-flow signals included, must not open the gate.
    if (isOutsideRequest(err)) return true;
    throw err;
  }

  if (accountsEnabled()) return Boolean(await currentUser());

  // Shared-password mode: the same cookie middleware checks.
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  const expected = createHash("sha256").update(`${password}.v1`).digest("hex");
  const got = jar.get("stb_auth")?.value ?? "";
  return (
    got.length === expected.length &&
    timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  );
}

/** Next's "`cookies` was called outside a request scope" error (E251). */
function isOutsideRequest(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as Error & { __NEXT_ERROR_CODE?: string }).__NEXT_ERROR_CODE;
  return code === "E251" || err.message.includes("outside a request scope");
}

/**
 * Every network request the audit engine makes goes through here.
 *
 * The reference engine calls `fetch` directly. This one cannot: SEO Tool runs
 * audits on a server, so a URL found on a crawled page — or a redirect a
 * crawled site sends — is the server being asked to connect somewhere. The
 * same SSRF guard the rest of the app uses (`src/lib/url-guard.ts`) is applied
 * to the first URL and to every redirect hop.
 *
 * Whether private addresses are allowed is a property of the audit run, not
 * of each call site, so it travels in AsyncLocalStorage: rules deep inside the
 * engine call `auditFetch` exactly as they called `fetch`, and still honour the
 * operator's choice for that run.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { guardUrl, SsrfBlockedError } from "@/lib/url-guard";

export type NetPolicy = {
  /** Operator-only: audit a site on localhost / a LAN / a docker hostname. */
  allowPrivate: boolean;
};

type RunState = NetPolicy & {
  /**
   * Guard verdicts by origin for this run. The guard resolves DNS, and a
   * crawl asks about the same handful of hosts thousands of times.
   */
  verdicts: Map<string, ReturnType<typeof guardUrl>>;
};

const policyStore = new AsyncLocalStorage<RunState>();

export function withNetPolicy<T>(policy: NetPolicy, fn: () => Promise<T>): Promise<T> {
  return policyStore.run({ ...policy, verdicts: new Map() }, fn);
}

export async function assertFetchable(
  url: string,
  state: RunState | undefined = policyStore.getStore(),
): Promise<void> {
  const allowPrivate = state?.allowPrivate ?? false;
  let key: string;
  try {
    key = new URL(url).origin;
  } catch {
    key = url;
  }
  let pending = state?.verdicts.get(key);
  if (!pending) {
    pending = guardUrl(url, { allowPrivate });
    state?.verdicts.set(key, pending);
  }
  const verdict = await pending;
  if (!verdict.ok) throw new SsrfBlockedError(verdict.reason);
}

/**
 * The guard bound to the current run, for callbacks that fire outside it.
 * Playwright emits route events from its own connection, where the
 * AsyncLocalStorage context of the run that opened the page is gone.
 */
export function captureFetchGuard(): (url: string) => Promise<void> {
  const state = policyStore.getStore();
  return (url) => assertFetchable(url, state);
}

const MAX_REDIRECTS = 20;

/**
 * `fetch` with the SSRF guard. Same signature and semantics as `fetch`:
 * `redirect: "manual"` returns the 3xx itself (after checking the first URL),
 * anything else follows redirects — one hop at a time, each hop checked.
 */
export async function auditFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const first = typeof input === "string" ? input : input.href;
  if (init.redirect === "manual") {
    await assertFetchable(first);
    return fetch(first, init);
  }
  let current = first;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertFetchable(current);
    const response = await fetch(current, { ...init, redirect: "manual" });
    const location =
      response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
    if (!location) return response;
    if (init.redirect === "error") {
      throw new TypeError(`Redirect from ${current} refused (redirect: "error")`);
    }
    await response.body?.cancel().catch(() => {});
    current = new URL(location, current).href;
  }
  throw new TypeError(`${first} exceeded ${MAX_REDIRECTS} redirects`);
}

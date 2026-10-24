/**
 * Rendered fetch for the full audit: the page as Chromium sees it, plus the
 * facts only a browser can report — Core Web Vitals (LCP, CLS, INP, FCP,
 * TTFB, TBT), script errors, failed subresources and per-asset headers.
 *
 * Runs on SEO Tool's shared browser pool (`src/lib/browser-pool.ts`) so an
 * audit queues behind rank checks and SERP scans instead of launching a
 * second Chromium. Every request the page makes — the document, its
 * subresources, its redirects — passes the same SSRF guard as `auditFetch`.
 */

import { mkdirSync, readFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import type { Page, Request, Response } from "playwright";
import { withBrowserContext } from "@/lib/browser-pool";
import { MOBILE_USER_AGENT, getUserAgent } from "@/audit/crawler/user-agent";
import { captureFetchGuard } from "@/audit/crawler/net";
import { rethrowIfAborted, throwIfAborted } from "@/audit/engine/errors";
import type {
  AssetInfo,
  CoreWebVitals,
  PlaywrightFetchResult,
  RenderDiagnostics,
  RenderOptions,
} from "@/audit/types";

/** The pool owns the browser; kept so callers written against the reference engine still compile. */
export async function closeBrowser(): Promise<void> {}

export const MAX_PAGE_ERRORS = 25;
export const MAX_CONSOLE_MESSAGES = 50;
export const MAX_FAILED_REQUESTS = 50;
export const MAX_ASSETS = 500;
export const KEPT_ASSET_HEADERS = new Set([
  "cache-control",
  "content-encoding",
  "content-length",
  "content-type",
  "expires",
  "age",
  "etag",
]);

type FailedRequest = RenderDiagnostics["failedRequests"][number];

export function collectDiagnostics(page: Page): RenderDiagnostics {
  const diagnostics: RenderDiagnostics = {
    pageErrors: [],
    consoleMessages: [],
    failedRequests: [],
  };
  const failuresByUrl = new Map<string, FailedRequest>();
  const recordFailure = (info: FailedRequest, authoritative: boolean) => {
    const existing = failuresByUrl.get(info.url);
    if (existing && !authoritative) return;
    if (!existing && failuresByUrl.size >= MAX_FAILED_REQUESTS) return;
    failuresByUrl.set(info.url, existing && authoritative ? { ...existing, ...info } : info);
    diagnostics.failedRequests = Array.from(failuresByUrl.values());
  };
  page.on("pageerror", (error) => {
    if (diagnostics.pageErrors.length >= MAX_PAGE_ERRORS) return;
    diagnostics.pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    const type = message.type();
    if (type !== "error" && type !== "warning") return;
    if (diagnostics.consoleMessages.length >= MAX_CONSOLE_MESSAGES) return;
    const location = message.location();
    diagnostics.consoleMessages.push({
      level: type,
      text: message.text().slice(0, 500),
      ...(location.url && { sourceUrl: location.url }),
      ...(location.lineNumber !== undefined && { line: location.lineNumber }),
    });
  });
  page.on("requestfailed", (request) => {
    recordFailure(
      {
        url: request.url(),
        resourceType: request.resourceType(),
        method: request.method(),
        failure: request.failure()?.errorText ?? "Request failed",
      },
      false,
    );
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    if (response.request().resourceType() === "document") return;
    recordFailure(
      {
        url: response.url(),
        resourceType: response.request().resourceType(),
        method: response.request().method(),
        failure: `HTTP ${status}`,
        statusCode: status,
      },
      true,
    );
  });
  return diagnostics;
}

export function buildAssetInfo(response: Response, statusByRequest: Map<Request, number>): AssetInfo {
  const request = response.request();
  const redirectChain: AssetInfo["redirectChain"] = [];
  const seenUrls = new Set([request.url()]);
  let redirectLoop = false;
  let hop = request.redirectedFrom();
  while (hop) {
    if (seenUrls.has(hop.url())) {
      redirectLoop = true;
      break;
    }
    seenUrls.add(hop.url());
    redirectChain.unshift({
      url: hop.url(),
      // A hop's own response event fired before the final one, so its status
      // is already recorded; 0 marks a hop whose response we never saw.
      statusCode: statusByRequest.get(hop) ?? 0,
    });
    hop = hop.redirectedFrom();
  }
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(response.headers())) {
    if (KEPT_ASSET_HEADERS.has(name)) headers[name] = value;
  }
  return {
    url: response.url(),
    resourceType: request.resourceType(),
    statusCode: response.status(),
    headers,
    redirectChain,
    redirectLoop,
  };
}

export function collectAssets(page: Page): AssetInfo[] {
  const assets: AssetInfo[] = [];
  const statusByRequest = new Map<Request, number>();
  page.on("response", (response) => {
    const request = response.request();
    statusByRequest.set(request, response.status());
    if (request.resourceType() === "document") return;
    if (request.redirectedTo()) return;
    if (assets.length >= MAX_ASSETS) return;
    assets.push(buildAssetInfo(response, statusByRequest));
  });
  return assets;
}

export const SETTLE_TIMEOUT_MS = 1e3;
export const MOBILE_CONTEXT = {
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};
export const DESKTOP_VIEWPORT = { width: 1350, height: 940 };

let webVitalsSource: string | null = null;
export function getWebVitalsSource(): string {
  if (webVitalsSource === null) {
    const require2 = createRequire(import.meta.url);
    const distDir = dirname(require2.resolve("web-vitals"));
    webVitalsSource = readFileSync(join(distDir, "web-vitals.attribution.iife.js"), "utf8");
  }
  return webVitalsSource;
}

type WebVitalMetric = {
  name: string;
  value: number;
  attribution?: { element?: string; largestShiftTarget?: string };
};
type VitalsWindow = Window & {
  __webVitals?: Record<string, (cb: (metric: WebVitalMetric) => void, opts: object) => void>;
  __cwv?: Record<string, WebVitalMetric>;
  __longTasks?: { start: number; duration: number }[];
};

export async function injectWebVitals(page: Page): Promise<void> {
  await page.addInitScript({
    content: `${getWebVitalsSource()}
;globalThis.__webVitals = webVitals;`,
  });
  await page.addInitScript(() => {
    const w = window as VitalsWindow;
    const wv = w.__webVitals;
    if (!wv) return;
    const collected: Record<string, WebVitalMetric> = {};
    w.__cwv = collected;
    const record = (metric: WebVitalMetric) => {
      collected[metric.name.toLowerCase()] = metric;
    };
    const options = { reportAllChanges: true };
    for (const name of ["onLCP", "onCLS", "onINP", "onFCP", "onTTFB"]) {
      try {
        wv[name]?.(record, options);
      } catch {}
    }
    const longTasks: { start: number; duration: number }[] = [];
    w.__longTasks = longTasks;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({ start: entry.startTime, duration: entry.duration });
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
}

export async function performSyntheticInteraction(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.addEventListener("click", (event) => event.preventDefault(), true);
    document.addEventListener("submit", (event) => event.preventDefault(), true);
    window.scrollBy(0, 600);
  });
  const target = page
    .locator('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea')
    .first();
  if ((await target.count()) > 0) {
    try {
      await target.click({ timeout: 1500 });
    } catch {}
  }
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
}

export async function fetchPageWithPlaywright(
  url: string,
  timeout = 3e4,
  options: RenderOptions = {},
): Promise<PlaywrightFetchResult> {
  throwIfAborted(options.signal);
  const guard = captureFetchGuard();
  await guard(url);
  return withBrowserContext(
    async (context) => {
      throwIfAborted(options.signal);
      await context.route("**/*", async (route) => {
        const requestUrl = route.request().url();
        if (!/^https?:/i.test(requestUrl)) return route.continue();
        try {
          await guard(requestUrl);
        } catch {
          return route.abort("blockedbyclient");
        }
        return route.continue();
      });
      const page = await context.newPage();
      const onAbort = () => {
        page.close().catch(() => {});
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      const diagnostics = collectDiagnostics(page);
      const assets = collectAssets(page);
      await injectWebVitals(page);
      try {
        const startTime = performance.now();
        const response = await page.goto(url, { waitUntil: "load", timeout });
        const loadTime = performance.now() - startTime;
        await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});
        const html = await page.content();
        if (options.screenshotPath) {
          mkdirSync(dirname(options.screenshotPath), { recursive: true });
          await page.screenshot({ path: options.screenshotPath, type: "png" }).catch(() => {});
        }
        if (options.simulateInteraction) {
          await performSyntheticInteraction(page);
        }
        const cwv = await measureCoreWebVitals(page);
        if (options.simulateInteraction && cwv.inp !== undefined) {
          cwv.inpSynthetic = true;
        }
        return {
          html,
          statusCode: response?.status() ?? 0,
          responseTime: Math.round(loadTime),
          cwv,
          diagnostics,
          assets,
        };
      } catch (error) {
        rethrowIfAborted(error, options.signal);
        throw error;
      } finally {
        options.signal?.removeEventListener("abort", onAbort);
        await page.close().catch(() => {});
      }
    },
    {
      // Measuring a page means loading all of it: the pool's default of
      // dropping images, fonts and CSS would erase LCP and CLS.
      blockHeavyResources: false,
      noProxy: true,
      locale: "en-US",
      ...(options.mobile
        ? { userAgent: MOBILE_USER_AGENT, ...MOBILE_CONTEXT }
        : { userAgent: getUserAgent(), viewport: DESKTOP_VIEWPORT }),
    },
  );
}

export async function measureCoreWebVitals(page: Page): Promise<CoreWebVitals> {
  return page.evaluate(() => {
    const w = window as VitalsWindow;
    const collected = w.__cwv;
    if (!collected) return {};
    const metrics: CoreWebVitals = {};
    const round = (value: number) => Math.round(value);
    if (collected.lcp) {
      metrics.lcp = round(collected.lcp.value);
      const element = collected.lcp.attribution?.element;
      if (element) metrics.lcpElement = element;
    }
    if (collected.fcp) metrics.fcp = round(collected.fcp.value);
    if (collected.ttfb) metrics.ttfb = round(collected.ttfb.value);
    if (collected.cls) {
      metrics.cls = Math.round(collected.cls.value * 1e3) / 1e3;
      const target = collected.cls.attribution?.largestShiftTarget;
      if (target) metrics.clsLargestShiftTarget = target;
    }
    if (collected.inp) metrics.inp = round(collected.inp.value);
    const longTasks = w.__longTasks;
    if (longTasks && metrics.fcp !== undefined) {
      const fcp = metrics.fcp;
      const blocking = longTasks
        .filter((task) => task.start + task.duration > fcp)
        .reduce((total, task) => total + Math.max(0, task.duration - 50), 0);
      metrics.tbt = round(blocking);
    }
    return metrics;
  });
}

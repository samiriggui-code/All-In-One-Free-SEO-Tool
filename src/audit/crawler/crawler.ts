import type {
  AuditContext,
  CrawledPage,
  CrawlProgress,
  DiscoverySource,
  InboundEdge,
  PlaywrightFetchResult,
  SiteContext,
  SitePageInfo,
  UrlFilterOptions,
} from "@/audit/types";
import type { Element } from "cheerio";
import * as cheerio2 from "cheerio";
import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { RobotsMatcher } from "@/audit/crawler/robots";
import { UrlFilter } from "@/audit/crawler/url-filter";
import { countWords2, extractMainContent } from "@/audit/rules/content/utils/text-extractor";
import { createAuditContext, fetchPage, type FetchResult } from "@/audit/crawler/fetcher";
import { getUserAgent } from "@/audit/crawler/user-agent";
import { pageKindFrom } from "@/audit/rules/content/page-kind";
import { rethrowIfAborted, throwIfAborted } from "@/audit/engine/errors";
import { summarizeSchemaNodes } from "@/audit/rules/schema/utils";
import { auditFetch } from "@/audit/crawler/net";

export function parseRobotsDirectiveTokens(content: string) {
  return content.toLowerCase().split(/[,\s]+/).map((d) => d.trim()).filter((d) => d.length > 0);
}
export interface CrawlerOptions {
  maxPages?: number;
  concurrency?: number;
  timeout?: number;
  onProgress?: (progress: CrawlProgress) => void;
  onPageStart?: (url: string) => void;
  signal?: AbortSignal;
  fetchPage?: typeof fetchPage;
  renderPage?: (url: string) => Promise<PlaywrightFetchResult>;
  urlFilter?: Partial<UrlFilterOptions>;
  respectRobots?: boolean;
  delayMs?: number;
  perHostDelayMs?: number;
}
type ResolvedCrawlerOptions = Required<Omit<CrawlerOptions, "onProgress" | "onPageStart" | "signal" | "renderPage" | "urlFilter">> &
  Pick<CrawlerOptions, "onProgress" | "onPageStart" | "signal" | "renderPage" | "urlFilter">;

export class Crawler {
  visited = new Set<string>();
  queue: string[] = [];
  /** Click distance from the entry URL, set when a URL is first discovered */
  depthByUrl = new Map<string, number>();
  /** How each normalised URL was discovered (link, canonical, redirect, entry) */
  discoverySourceByUrl = new Map<string, Set<DiscoverySource>>();
  /** Normalised entry URL, the root of the depth measurement */
  entryUrl = "";
  hostname = "";
  options: ResolvedCrawlerOptions;
  results: CrawledPage[] = [];
  /** Earliest time any next request may start (politeness scheduling) */
  nextGlobalSlot = 0;
  /** Earliest time the next request to each host may start */
  nextHostSlot = new Map<string, number>();
  activeCount = 0;
  urlFilter: UrlFilter;
  /** Built once per crawl from the site's robots.txt; null when not applied. */
  robots: RobotsMatcher | null = null;
  constructor(options: CrawlerOptions = {}) {
    this.options = {
      maxPages: options.maxPages ?? 10,
      concurrency: options.concurrency ?? 3,
      timeout: options.timeout ?? 3e4,
      onProgress: options.onProgress,
      onPageStart: options.onPageStart,
      signal: options.signal,
      fetchPage: options.fetchPage ?? fetchPage,
      renderPage: options.renderPage,
      urlFilter: options.urlFilter,
      respectRobots: options.respectRobots ?? true,
      // 0, not the config's 100/200: only the CLI passes the configured value,
      // so a directly-built Crawler keeps its old speed.
      delayMs: options.delayMs ?? 0,
      perHostDelayMs: options.perHostDelayMs ?? 0
    };
    this.urlFilter = new UrlFilter(options.urlFilter);
  }
  /**
   * Fetch and parse the site's robots.txt once per crawl.
   *
   * A site with no robots.txt, or one that cannot be reached, permits
   * everything — the same posture every other crawler takes.
   */
  async loadRobots(startUrl: string) {
    this.robots = null;
    if (!this.options.respectRobots) return;
    const signal = this.options.signal;
    try {
      const robotsUrl = new URL("/robots.txt", startUrl).href;
      const timeout = AbortSignal.timeout(this.options.timeout);
      const response = await auditFetch(robotsUrl, {
        headers: { "User-Agent": getUserAgent() },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout
      });
      if (!response.ok) return;
      this.robots = new RobotsMatcher(await response.text(), getUserAgent());
    } catch (error) {
      rethrowIfAborted(error, signal);
    }
  }
  /**
   * Crawl starting from a URL
   * @param startUrl - URL to start crawling from
   * @param maxPages - Override max pages (optional)
   * @param concurrency - Override concurrency (optional)
   * @returns Array of CrawledPage results
   */
  async crawl(startUrl: string, maxPages?: number, concurrency?: number): Promise<CrawledPage[]> {
    this.visited.clear();
    this.queue = [];
    this.depthByUrl.clear();
    this.discoverySourceByUrl.clear();
    this.results = [];
    this.activeCount = 0;
    if (maxPages !== void 0) {
      this.options.maxPages = maxPages;
    }
    if (concurrency !== void 0) {
      this.options.concurrency = concurrency;
    }
    try {
      const url = new URL(startUrl);
      this.hostname = url.hostname;
    } catch {
      throw new Error(`Invalid start URL: ${startUrl}`);
    }
    throwIfAborted(this.options.signal);
    await this.loadRobots(startUrl);
    const normalizedStart = this.normalizeUrl(startUrl);
    this.entryUrl = normalizedStart;
    this.depthByUrl.set(normalizedStart, 0);
    this.visited.add(normalizedStart);
    this.queue.push(normalizedStart);
    this.recordDiscoverySource(normalizedStart, "entry");
    await this.processQueue();
    this.reportProgress("", true);
    return this.results;
  }
  /**
   * Process the queue with concurrency control
   */
  async processQueue() {
    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.options.concurrency; i++) {
      workers.push(this.worker());
    }
    await Promise.all(workers);
  }
  /**
   * Worker that processes URLs from the queue
   */
  async worker(): Promise<void> {
    while (true) {
      throwIfAborted(this.options.signal);
      if (this.results.length >= this.options.maxPages) {
        break;
      }
      const url = this.getNextUrl();
      if (!url) {
        await this.sleep(100);
        const retryUrl = this.getNextUrl();
        if (!retryUrl) {
          break;
        }
        await this.waitForTurn(retryUrl);
        await this.processUrl(retryUrl);
      } else {
        await this.waitForTurn(url);
        await this.processUrl(url);
      }
    }
  }
  /**
   * Get next URL from queue (thread-safe)
   */
  getNextUrl(): string | null {
    if (this.queue.length === 0) {
      return null;
    }
    if (this.results.length + this.activeCount >= this.options.maxPages) {
      return null;
    }
    const url = this.queue.shift() ?? null;
    if (url) this.activeCount++;
    return url;
  }
  /**
   * Process a single URL
   */
  async processUrl(url: string) {
    try {
      this.reportProgress(url);
      this.options.onPageStart?.(url);
      let fetchResult: FetchResult;
      try {
        fetchResult = await this.options.fetchPage(url, this.options.timeout, {
          trackRedirects: true,
          ...this.options.signal && { signal: this.options.signal }
        });
      } catch (error) {
        rethrowIfAborted(error, this.options.signal);
        this.results.push({
          url,
          context: this.createEmptyContext(url),
          error: error instanceof Error ? error.message : "Unknown error"
        });
        return;
      }
      let cwv: PlaywrightFetchResult["cwv"] = {};
      let renderedHtml: string | undefined;
      let diagnostics: PlaywrightFetchResult["diagnostics"];
      let assets: PlaywrightFetchResult["assets"];
      if (this.options.renderPage) {
        try {
          const rendered = await this.options.renderPage(url);
          cwv = rendered.cwv;
          renderedHtml = rendered.html;
          diagnostics = rendered.diagnostics;
          assets = rendered.assets;
        } catch (error) {
          rethrowIfAborted(error, this.options.signal);
        }
      }
      const context = createAuditContext(url, fetchResult, cwv);
      if (this.options.signal) {
        context.signal = this.options.signal;
      }
      if (renderedHtml) {
        context.renderedHtml = renderedHtml;
        context.rendered$ = cheerio2.load(renderedHtml);
      }
      if (diagnostics) {
        context.renderDiagnostics = diagnostics;
      }
      if (assets) {
        context.assets = assets;
      }
      this.results.push({ url, context });
      this.discoverUrls(context);
      this.discoverFromPageSignals(context);
    } finally {
      this.activeCount--;
    }
  }
  /**
   * Build the site-wide link graph from the pages just crawled.
   *
   * Call after `crawl()`. Unlike discovery, this includes nofollow links and
   * links the URL filter excluded from crawling: a page that is linked is not
   * orphaned regardless of whether we chose to follow the link. Self-links are
   * ignored so a page cannot be its own inbound reference.
   *
   * @returns The graph, shared by reference across every page's context
   */
  buildSiteContext(): SiteContext {
    const inboundLinksByUrl = new Map<string, Set<string>>();
    const outboundLinksByUrl = new Map<string, Set<string>>();
    const inboundEdgesByUrl = new Map<string, InboundEdge[]>();
    const pages = new Map<string, SitePageInfo>();
    let pageCount = 0;
    for (const page of this.results) {
      const from = this.normalizeUrl(page.url);
      pages.set(from, this.buildPageInfo(page));
      if (page.error) continue;
      pageCount++;
      const targets = new Set<string>();
      for (const link of page.context.links) {
        if (!link.isInternal) continue;
        const to = this.normalizeUrl(link.href);
        if (to === from) continue;
        if (!this.isSameDomain(to)) continue;
        targets.add(to);
        let inbound = inboundLinksByUrl.get(to);
        if (!inbound) {
          inbound = new Set<string>();
          inboundLinksByUrl.set(to, inbound);
        }
        inbound.add(from);
        let edges = inboundEdgesByUrl.get(to);
        if (!edges) {
          edges = [];
          inboundEdgesByUrl.set(to, edges);
        }
        edges.push({
          from,
          nofollow: link.isNoFollow,
          anchor: link.text.trim(),
          chrome: link.inChrome === true
        });
      }
      outboundLinksByUrl.set(from, targets);
    }
    return {
      entryUrl: this.entryUrl,
      pageCount,
      depthByUrl: this.depthByUrl,
      inboundLinksByUrl,
      outboundLinksByUrl,
      pages,
      discoverySourceByUrl: this.discoverySourceByUrl,
      inboundEdgesByUrl,
      normalize: (url: string) => this.normalizeUrl(url)
    };
  }
  /**
   * Distil one crawled page into its SitePageInfo record.
   *
   * Parses only what is already in memory (`context.$`, headers) — no new
   * fetches. Errored pages carry an empty context, so parsing them yields the
   * defaults with `statusCode: 0`.
   */
  buildPageInfo(page: CrawledPage): SitePageInfo {
    const { $, headers, statusCode } = page.context;
    const info: SitePageInfo = {
      statusCode,
      noindex: false,
      nofollow: false,
      // Best-effort: the matcher exists only when respectRobots is on and
      // robots.txt was reachable, so "unknown" is reported as false.
      disallowed: this.robots ? !this.robots.isAllowed(page.url) : false,
      hreflangOut: {}
    };
    const canonicalHref = $('link[rel="canonical"]').first().attr("href");
    if (canonicalHref !== void 0) {
      try {
        info.canonical = new URL(canonicalHref, page.url).href;
      } catch {
        info.canonical = null;
      }
    }
    const directives: string[] = [];
    $('meta[name="robots"]').each((_, el: Element) => {
      directives.push(...parseRobotsDirectiveTokens($(el).attr("content") ?? ""));
    });
    const xRobotsTag = headers["x-robots-tag"];
    if (xRobotsTag) {
      directives.push(...parseRobotsDirectiveTokens(xRobotsTag));
    }
    info.noindex = directives.includes("noindex") || directives.includes("none");
    info.nofollow = directives.includes("nofollow") || directives.includes("none");
    $('link[rel="alternate"][hreflang]').each((_, el: Element) => {
      const code = $(el).attr("hreflang")?.trim();
      const href = $(el).attr("href");
      if (!code || !href) return;
      try {
        info.hreflangOut[code] = new URL(href, page.url).href;
      } catch {
      }
    });
    const h1 = $("h1").first().text().trim();
    if (h1) info.h1 = h1;
    const title = $(DOCUMENT_TITLE).first().text().replace(/\s+/g, " ").trim();
    if (title) info.title = title;
    info.wordCount = countWords2(extractMainContent($));
    const schemaNodes = summarizeSchemaNodes($);
    info.pageKind = pageKindFrom(
      schemaNodes.flatMap((node) => node.types),
      page.url
    );
    if (schemaNodes.length > 0) info.schemaNodes = schemaNodes;
    return info;
  }
  /**
   * Discover and queue new URLs from page links
   */
  discoverUrls(context: AuditContext) {
    const parentDepth = this.depthByUrl.get(this.normalizeUrl(context.url)) ?? 0;
    for (const link of context.links) {
      if (!link.isInternal) {
        continue;
      }
      const normalizedUrl = this.normalizeUrl(link.href);
      if (!this.isSameDomain(normalizedUrl)) {
        continue;
      }
      if (this.isNonHtmlResource(normalizedUrl)) {
        continue;
      }
      this.recordDiscoverySource(normalizedUrl, "link");
      if (link.isNoFollow) {
        continue;
      }
      if (this.visited.has(normalizedUrl)) {
        continue;
      }
      if (!this.urlFilter.shouldCrawl(normalizedUrl)) {
        continue;
      }
      if (this.robots && !this.robots.isAllowed(normalizedUrl)) {
        continue;
      }
      this.visited.add(normalizedUrl);
      this.depthByUrl.set(normalizedUrl, parentDepth + 1);
      this.queue.push(normalizedUrl);
    }
  }
  /**
   * Record discovery sources declared by the page itself: its canonical tag
   * and, when the fetch tracked them, its redirect hops.
   *
   * Internal canonical targets are also queued for crawling — a deliberate,
   * conservative crawl-scope expansion: a canonical is a strong
   * page-equivalence signal, and without it the "URL reachable only via
   * canonical" hints could never fire. Guardrails: http(s) only, same domain,
   * URL filter and robots.txt applied, and the queue is still capped by
   * maxPages (workers stop dequeuing once the cap is hit). Redirect targets
   * are recorded but NOT queued: the fetch already followed the redirect, so
   * re-fetching the target would duplicate work.
   */
  discoverFromPageSignals(context: AuditContext) {
    const canonicalHref = context.$('link[rel="canonical"]').first().attr("href");
    if (canonicalHref !== void 0) {
      try {
        const canonicalUrl = new URL(canonicalHref, context.url).href;
        if (this.isHttpSameDomain(canonicalUrl) && !this.isNonHtmlResource(canonicalUrl)) {
          const normalizedCanonical = this.normalizeUrl(canonicalUrl);
          this.recordDiscoverySource(normalizedCanonical, "canonical");
          if (!this.visited.has(normalizedCanonical) && this.urlFilter.shouldCrawl(normalizedCanonical) && (!this.robots || this.robots.isAllowed(normalizedCanonical))) {
            this.visited.add(normalizedCanonical);
            this.depthByUrl.set(
              normalizedCanonical,
              this.depthByUrl.get(this.normalizeUrl(context.url)) ?? 0
            );
            this.queue.push(normalizedCanonical);
          }
        }
      } catch {
      }
    }
    if (context.redirectChain) {
      for (const hop of context.redirectChain.slice(1)) {
        if (!this.isHttpSameDomain(hop.url)) continue;
        this.recordDiscoverySource(this.normalizeUrl(hop.url), "redirect");
      }
    }
  }
  /**
   * Check if a URL is http(s) and on the crawled domain
   */
  isHttpSameDomain(url: string) {
    try {
      const urlObj = new URL(url);
      return (urlObj.protocol === "http:" || urlObj.protocol === "https:") && urlObj.hostname === this.hostname;
    } catch {
      return false;
    }
  }
  /**
   * Record one discovery source for a normalised URL; sources accumulate.
   */
  recordDiscoverySource(normalizedUrl: string, source: DiscoverySource) {
    let sources = this.discoverySourceByUrl.get(normalizedUrl);
    if (!sources) {
      sources = new Set<DiscoverySource>();
      this.discoverySourceByUrl.set(normalizedUrl, sources);
    }
    sources.add(source);
  }
  /**
   * Check if URL is on the same domain
   */
  isSameDomain(url: string) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === this.hostname;
    } catch {
      return false;
    }
  }
  /**
   * Check if URL points to a non-HTML resource
   */
  isNonHtmlResource(url: string) {
    const nonHtmlExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".zip",
      ".rar",
      ".tar",
      ".gz",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".webp",
      ".ico",
      ".mp3",
      ".mp4",
      ".avi",
      ".mov",
      ".wmv",
      ".css",
      ".js",
      ".json",
      ".xml"
    ];
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      return nonHtmlExtensions.some((ext) => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }
  /**
   * Normalize URL using the URL filter (removes tracking params, fragments, etc.)
   */
  normalizeUrl(url: string) {
    return this.urlFilter.normalizeUrl(url);
  }
  /**
   * Report progress via callback
   */
  reportProgress(currentUrl: string, done = false) {
    if (!this.options.onProgress) return;
    const crawled = this.results.length;
    const total = Math.max(
      crawled,
      Math.min(crawled + this.queue.length + this.activeCount, this.options.maxPages)
    );
    this.options.onProgress({
      crawled,
      total,
      currentUrl,
      discovered: this.visited.size,
      maxPages: this.options.maxPages,
      done
    });
  }
  /**
   * Create an empty context for failed fetches
   */
  createEmptyContext(url: string): AuditContext {
    return {
      url,
      html: "",
      $: cheerio2.load(""),
      headers: {},
      statusCode: 0,
      responseTime: 0,
      cwv: {},
      links: [],
      images: [],
      invalidLinks: [],
      specialLinks: [],
      figures: [],
      inlineSvgs: [],
      pictureElements: []
    };
  }
  /**
   * Sleep helper
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Hold a worker until this request is allowed to start.
   *
   * The slot is reserved synchronously before the await, so concurrent workers
   * queue behind each other instead of all reading the same "last request"
   * timestamp and starting together — which is how a delay silently becomes
   * no delay at concurrency > 1.
   */
  async waitForTurn(url: string) {
    const delay = this.options.delayMs ?? 0;
    const hostDelay = this.options.perHostDelayMs ?? 0;
    if (delay <= 0 && hostDelay <= 0) return;
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      host = "";
    }
    const now = Date.now();
    const nextAllowed = Math.max(
      now,
      this.nextGlobalSlot,
      this.nextHostSlot.get(host) ?? 0
    );
    this.nextGlobalSlot = nextAllowed + delay;
    this.nextHostSlot.set(host, nextAllowed + hostDelay);
    const wait = nextAllowed - now;
    if (wait > 0) await this.sleep(wait);
  }
}

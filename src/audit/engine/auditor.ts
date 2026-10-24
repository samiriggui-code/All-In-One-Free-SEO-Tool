import type { CheerioAPI } from "cheerio";
import type {
  AuditContext,
  AuditorOptions,
  AuditResult,
  AuditRunOptions,
  CategoryDefinition,
  CategoryResult,
  CoreWebVitals,
  CrawledPage,
  DiscoverySource,
  PlaywrightFetchResult,
  RuleResult,
  SiteContext,
  SitemapFetchResult,
} from "@/audit/types";
import { AuditError, rethrowIfAborted, throwIfAborted } from "@/audit/engine/errors";
import { Crawler } from "@/audit/crawler/crawler";
import { SCORING_VERSION, buildAuditResult, buildCategoryResult } from "@/audit/scoring/scoring";
import { applyScoreCaps, pageCaps, readPageFacts, siteCaps } from "@/audit/scoring/score-caps";
import { buildPageSnapshot } from "@/audit/engine/page-snapshot";
import { categories } from "@/audit/engine/categories";
import { fetchPageWithPlaywright } from "@/audit/crawler/playwright-fetcher";
import { createAuditContext, fetchPage, unauditableReason } from "@/audit/crawler/fetcher";
import { fetchSitemap } from "@/audit/crawler/sitemap";
import { getRulesByCategory, resetCrossPageState } from "@/audit/engine/rule-registry";
import { getUserAgent } from "@/audit/crawler/user-agent";
import { isRuleEnabled } from "@/audit/engine/pattern-matcher";
import { auditFetch } from "@/audit/crawler/net";
import { loadAllRules } from "@/audit/rules";

export function markSitemapDiscoverySources(site: SiteContext, sitemap: SitemapFetchResult): void {
  if (!sitemap.urls.length) return;
  const map = site.discoverySourceByUrl ?? new Map<string, Set<DiscoverySource>>();
  site.discoverySourceByUrl = map;
  for (const url of sitemap.urls) {
    const key = site.normalize(url);
    let sources = map.get(key);
    if (!sources) {
      sources = new Set<DiscoverySource>();
      map.set(key, sources);
    }
    sources.add("sitemap");
  }
}
type ResolvedAuditorOptions = Required<Omit<AuditorOptions, "browserFetcher" | "signal">> &
  Pick<AuditorOptions, "browserFetcher" | "signal">;

export class Auditor {
  options: ResolvedAuditorOptions;
  rulesLoaded = false;
  categoriesToAudit: CategoryDefinition[] = [];
  constructor(options: AuditorOptions = {}) {
    this.options = {
      categories: options.categories ?? [],
      timeout: options.timeout ?? 3e4,
      measureCwv: options.measureCwv ?? false,
      mobileParity: options.mobileParity ?? false,
      simulateInteraction: options.simulateInteraction ?? false,
      // Defaults to true so a programmatic crawl is polite unless asked not to
      // be. A staging site's robots.txt blocks everything on purpose, and it
      // is the user's own site, so staging crawls past it.
      respectRobots: options.staging ? false : options.respectRobots ?? true,
      staging: options.staging ?? false,
      // 0 rather than the config's 100/200: a programmatic Auditor is not
      // silently slowed down. The CLI passes the configured values.
      urlFilter: options.urlFilter ?? {},
      enableRules: options.enableRules ?? [],
      disableRules: options.disableRules ?? [],
      delayMs: options.delayMs ?? 0,
      perHostDelayMs: options.perHostDelayMs ?? 0,
      browserFetcher: options.browserFetcher,
      signal: options.signal,
      onCategoryStart: options.onCategoryStart ?? (() => {
      }),
      onCategoryComplete: options.onCategoryComplete ?? (() => {
      }),
      onRuleComplete: options.onRuleComplete ?? (() => {
      }),
      onPageComplete: options.onPageComplete ?? (() => {
      }),
      onCrawlProgress: options.onCrawlProgress ?? (() => {
      }),
      onPageStart: options.onPageStart ?? (() => {
      })
    };
    this.categoriesToAudit = this.filterCategories();
  }
  /**
   * Filter categories based on options
   */
  filterCategories(): CategoryDefinition[] {
    if (this.options.categories.length === 0) {
      return categories;
    }
    return categories.filter(
      (cat) => this.options.categories.includes(cat.id)
    );
  }
  /**
   * Ensure rules are loaded before running audit
   */
  async ensureRulesLoaded() {
    if (!this.rulesLoaded) {
      await loadAllRules();
      this.rulesLoaded = true;
    }
  }
  /**
   * Fetch robots.txt content for a site
   */
  async fetchRobotsTxt(url: string): Promise<string | undefined> {
    const signal = this.options.signal;
    throwIfAborted(signal);
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5e3);
      try {
        const response = await auditFetch(robotsUrl, {
          signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
          headers: {
            "User-Agent": getUserAgent()
          }
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          return await response.text();
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      rethrowIfAborted(error, signal);
    }
    return void 0;
  }
  /**
   * Discover and fetch the site's sitemap(s).
   *
   * Delegates to the sitemap module, which follows sitemap indexes,
   * decompresses gzipped sitemaps and reads every `Sitemap:` line in
   * robots.txt rather than only the first.
   */
  async fetchSitemap(url: string, robotsTxtContent?: string): Promise<SitemapFetchResult> {
    return fetchSitemap(url, robotsTxtContent, this.options.signal);
  }
  /**
   * Enrich audit context with robots.txt, sitemap data
   */
  async enrichContext(context: AuditContext, url: string) {
    const robotsTxtContent = await this.fetchRobotsTxt(url);
    context.robotsTxtContent = robotsTxtContent;
    const sitemapData = await this.fetchSitemap(url, robotsTxtContent);
    this.applySitemapData(context, sitemapData);
  }
  /**
   * Copy shared sitemap data onto a page context
   */
  applySitemapData(context: AuditContext, sitemap: SitemapFetchResult): void {
    context.sitemapContent = sitemap.content;
    context.sitemapUrls = sitemap.urls;
    context.sitemapUrlSources = sitemap.urlSources;
    context.sitemapEntries = sitemap.entries;
    context.sitemapIsIndex = sitemap.isIndex;
    context.sitemapDocuments = sitemap.documents;
    context.sitemapSkippedCount = sitemap.skippedSitemaps;
  }
  /**
   * Run a single-page audit
   * @param url - URL to audit
   * @returns AuditResult for the page
   */
  async audit(url: string): Promise<AuditResult> {
    throwIfAborted(this.options.signal);
    await this.ensureRulesLoaded();
    resetCrossPageState();
    const fetchResult = await fetchPage(url, this.options.timeout, {
      trackRedirects: true,
      ...this.options.signal && { signal: this.options.signal }
    });
    const unauditable = unauditableReason(
      url,
      fetchResult.headers["content-type"] ?? null,
      fetchResult.html
    );
    if (unauditable) {
      throw new AuditError("non-html", unauditable);
    }
    if (fetchResult.statusCode >= 400) {
      const chain = fetchResult.redirectChain;
      const finalUrl = chain && chain.length > 0 ? chain[chain.length - 1].url : url;
      const via = finalUrl !== url ? ` (redirected to ${finalUrl})` : "";
      throw new AuditError(
        "http-error",
        `The page returned HTTP ${fetchResult.statusCode}${via}.`
      );
    }
    let cwv: CoreWebVitals = {};
    let renderedHtml: string | undefined;
    let rendered$: CheerioAPI | undefined;
    let renderDiagnostics: PlaywrightFetchResult["diagnostics"];
    let assets: PlaywrightFetchResult["assets"];
    let mobileHtml: string | undefined;
    let mobile$: CheerioAPI | undefined;
    if (this.options.measureCwv) {
      const fetcher = this.options.browserFetcher ?? fetchPageWithPlaywright;
      try {
        const pwResult = await fetcher(url, this.options.timeout, {
          simulateInteraction: this.options.simulateInteraction,
          ...this.options.signal && { signal: this.options.signal }
        });
        cwv = pwResult.cwv;
        renderDiagnostics = pwResult.diagnostics;
        assets = pwResult.assets;
        if (pwResult.html) {
          renderedHtml = pwResult.html;
          const cheerio3 = await import("cheerio");
          rendered$ = cheerio3.load(renderedHtml);
        }
        if (this.options.mobileParity) {
          try {
            const mobileResult = await fetchPageWithPlaywright(url, this.options.timeout, {
              mobile: true,
              ...this.options.signal && { signal: this.options.signal }
            });
            if (mobileResult.html) {
              mobileHtml = mobileResult.html;
              const cheerio3 = await import("cheerio");
              mobile$ = cheerio3.load(mobileHtml);
            }
          } catch (error) {
            rethrowIfAborted(error, this.options.signal);
          }
        }
      } catch (error) {
        rethrowIfAborted(error, this.options.signal);
      }
    }
    const context = createAuditContext(url, fetchResult, cwv);
    if (this.options.signal) {
      context.signal = this.options.signal;
    }
    await this.enrichContext(context, url);
    if (renderedHtml) {
      context.renderedHtml = renderedHtml;
      context.rendered$ = rendered$;
    }
    if (renderDiagnostics) {
      context.renderDiagnostics = renderDiagnostics;
    }
    if (assets) {
      context.assets = assets;
    }
    if (mobileHtml) {
      context.mobileHtml = mobileHtml;
      context.mobile$ = mobile$;
    }
    const categoryResults = await this.runAllCategories(context);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const result = buildAuditResult(
      url,
      categoryResults,
      this.categoriesToAudit,
      timestamp,
      1,
      buildPageSnapshot(context),
      this.runOptions(false, 1, 1),
      { pages: [url], detail: "per-page" }
    );
    return applyScoreCaps(result, pageCaps(readPageFacts(context), { staging: this.options.staging }));
  }
  /**
   * Run audit with crawling (multiple pages)
   * @param url - Starting URL to crawl from
   * @param maxPages - Maximum number of pages to crawl
   * @param concurrency - Number of concurrent requests
   * @returns AuditResult with aggregated scores
   */
  async auditWithCrawl(url: string, maxPages = 10, concurrency = 3): Promise<AuditResult> {
    throwIfAborted(this.options.signal);
    await this.ensureRulesLoaded();
    resetCrossPageState();
    const robotsTxtContent = await this.fetchRobotsTxt(url);
    const sitemapData = await this.fetchSitemap(url, robotsTxtContent);
    const fetcher = this.options.browserFetcher ?? fetchPageWithPlaywright;
    const crawler = new Crawler({
      maxPages,
      concurrency,
      timeout: this.options.timeout,
      respectRobots: this.options.respectRobots,
      urlFilter: this.options.urlFilter,
      delayMs: this.options.delayMs,
      perHostDelayMs: this.options.perHostDelayMs,
      ...this.options.signal && { signal: this.options.signal },
      onProgress: (progress) => this.options.onCrawlProgress(progress),
      onPageStart: (pageUrl: string) => this.options.onPageStart(pageUrl),
      renderPage: this.options.measureCwv ? async (pageUrl: string): Promise<PlaywrightFetchResult> => {
        try {
          const result2 = await fetcher(pageUrl, this.options.timeout, {
            ...this.options.signal && { signal: this.options.signal }
          });
          return result2;
        } catch (error) {
          rethrowIfAborted(error, this.options.signal);
          // A failed render leaves the static fetch to stand on its own.
          return { html: "", statusCode: 0, responseTime: 0, cwv: {} };
        }
      } : void 0
    });
    const crawledPages = await crawler.crawl(url, maxPages, concurrency);
    if (crawledPages.length === 0) {
      throw new AuditError("no-pages", `The crawl of ${url} found no pages to audit`);
    }
    const site = crawler.buildSiteContext();
    markSitemapDiscoverySources(site, sitemapData);
    for (const crawledPage of crawledPages) {
      if (crawledPage.context) {
        crawledPage.context.robotsTxtContent = robotsTxtContent;
        crawledPage.context.site = site;
        if (this.options.signal) {
          crawledPage.context.signal = this.options.signal;
        }
        this.applySitemapData(crawledPage.context, sitemapData);
      }
    }
    const allCategoryResults = await this.auditPages(crawledPages);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const result = buildAuditResult(
      url,
      allCategoryResults,
      this.categoriesToAudit,
      timestamp,
      crawledPages.length,
      void 0,
      this.runOptions(true, maxPages, concurrency),
      { pages: crawledPages.map((p) => p.url), detail: "per-page" }
    );
    const start = crawledPages.find((page) => page.url === site.entryUrl && !page.error);
    if (!start) return result;
    return applyScoreCaps(
      result,
      siteCaps(readPageFacts(start.context), start.url, { staging: this.options.staging })
    );
  }
  /**
   * Run every category across multiple pages and aggregate the rule results.
   *
   * Each category's score is the weighted average over every rule result from
   * every page, so a rule that fails on 3 of 50 pages drags the category down
   * proportionally rather than deciding it outright.
   *
   * Used by both the live crawl path and `seomator analyze`, which replays
   * pages from a stored crawl.
   *
   * @param pages - Pages to audit; entries with an `error` are skipped
   * @returns One CategoryResult per audited category
   */
  async auditPages(pages: CrawledPage[]): Promise<CategoryResult[]> {
    const crawledPages = pages;
    const categoryRuleResults = new Map<string, RuleResult[]>();
    for (const category of this.categoriesToAudit) {
      categoryRuleResults.set(category.id, []);
    }
    let pageNumber = 0;
    for (const crawledPage of crawledPages) {
      throwIfAborted(this.options.signal);
      pageNumber++;
      if (crawledPage.error) {
        this.options.onPageComplete(crawledPage.url, pageNumber, crawledPages.length);
        continue;
      }
      const pageResults = await this.runAllCategories(crawledPage.context);
      for (const categoryResult of pageResults) {
        const existing = categoryRuleResults.get(categoryResult.categoryId);
        if (existing) {
          existing.push(...categoryResult.results);
        }
      }
      this.options.onPageComplete(crawledPage.url, pageNumber, crawledPages.length);
    }
    const finalResults: CategoryResult[] = [];
    for (const category of this.categoriesToAudit) {
      const results = categoryRuleResults.get(category.id) ?? [];
      finalResults.push(buildCategoryResult(category.id, results));
    }
    return finalResults;
  }
  /**
   * Run all categories against an audit context
   * @param context - The audit context to run rules against
   * @returns Array of CategoryResult
   */
  async runAllCategories(context: AuditContext): Promise<CategoryResult[]> {
    const results: CategoryResult[] = [];
    for (const category of this.categoriesToAudit) {
      throwIfAborted(this.options.signal);
      this.options.onCategoryStart(category.id, category.name);
      const rules2 = getRulesByCategory(category.id).filter(
        (rule) => isRuleEnabled(rule.id, this.options.enableRules, this.options.disableRules)
      );
      if (rules2.length === 0) {
        continue;
      }
      const ruleResults: RuleResult[] = [];
      for (const rule of rules2) {
        try {
          const result = await rule.run(context);
          const resultWithMeta: RuleResult = {
            ...result,
            ruleId: rule.id,
            weight: result.weight ?? rule.weight,
            details: {
              ...result.details,
              pageUrl: context.url
            }
          };
          ruleResults.push(resultWithMeta);
          this.options.onRuleComplete(rule.id, rule.name, resultWithMeta);
        } catch (error) {
          rethrowIfAborted(error, this.options.signal);
          const errorResult: RuleResult = {
            ruleId: rule.id,
            status: "fail",
            message: `Rule execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            score: 0,
            weight: rule.weight,
            details: {
              pageUrl: context.url
            }
          };
          ruleResults.push(errorResult);
          this.options.onRuleComplete(rule.id, rule.name, errorResult);
        }
      }
      const categoryResult = buildCategoryResult(category.id, ruleResults);
      results.push(categoryResult);
      this.options.onCategoryComplete(category.id, category.name, categoryResult);
    }
    return results;
  }
  /**
   * The options this audit ran with, recorded on the result.
   *
   * Two scores are only comparable if they were measured the same way, and
   * the CLI and the desktop app do not default the same: `--no-cwv` is
   * opt-out, while the GUI's Core Web Vitals toggle is off. Both write to the
   * same history.
   */
  runOptions(crawl: boolean, maxPages: number, concurrency: number): AuditRunOptions {
    return {
      crawl,
      maxPages,
      concurrency,
      measureCwv: this.options.measureCwv,
      mobile: this.options.mobileParity,
      simulateInteraction: this.options.simulateInteraction,
      categories: this.options.categories,
      scoringVersion: SCORING_VERSION,
      enableRules: this.options.enableRules,
      disableRules: this.options.disableRules,
      // Recorded only when set: absent reads as a production audit, which is
      // what every audit stored before the option existed was.
      ...this.options.staging && { staging: true },
      timeout: this.options.timeout
    };
  }
  /**
   * Get the categories that will be audited
   */
  getCategoriesToAudit(): CategoryDefinition[] {
    return this.categoriesToAudit;
  }
}
export function createAuditor(options?: AuditorOptions): Auditor {
  return new Auditor(options);
}

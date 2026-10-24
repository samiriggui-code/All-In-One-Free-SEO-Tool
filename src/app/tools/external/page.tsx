"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Each tool declares how to convert a user input (a domain/URL or a keyword)
 * into the right deep-link. Some tools need a hostname, some take a full URL,
 * some accept either — we normalize.
 */
type Tool = {
  /** Message key under tools.ui.external.desc — what clicking gives you. */
  id: string;
  name: string;
  /** Display category: message key under tools.ui.external.categories. */
  category: string;
  pricing: "free" | "free-tier" | "paid-trial";
  /** Build the URL from user input. Receives normalized {hostname, fullUrl, keyword}. */
  build: (ctx: {
    hostname: string;
    fullUrl: string;
    keyword: string;
  }) => string;
  /** Which input field is required. */
  requires: "hostname" | "fullUrl" | "keyword";
};

const tools: Tool[] = [
  // === Authority / backlinks (the paid metric we can't replicate) ===
  {
    id: "mozDomainAnalysis",
    name: "Moz Free Domain Analysis",
    category: "authority",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://moz.com/domain-analysis?site=${encodeURIComponent(hostname)}`,
  },
  {
    id: "ahrefsBacklinkChecker",
    name: "Ahrefs Free Backlink Checker",
    category: "authority",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://ahrefs.com/backlink-checker/?input=${encodeURIComponent(hostname)}&mode=subdomains`,
  },
  {
    id: "openLinkProfiler",
    name: "OpenLinkProfiler",
    category: "authority",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://www.openlinkprofiler.org/r/${encodeURIComponent(hostname)}`,
  },
  {
    id: "ubersuggestDomainOverview",
    name: "Ubersuggest Domain Overview",
    category: "authority",
    pricing: "free-tier",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://app.neilpatel.com/en/seo_analyzer/site_audit?domain=${encodeURIComponent(hostname)}`,
  },
  {
    id: "semrushDomainOverview",
    name: "Semrush Domain Overview",
    category: "authority",
    pricing: "paid-trial",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://www.semrush.com/analytics/overview/?q=${encodeURIComponent(hostname)}&searchType=domain`,
  },

  // === Keyword research ===
  {
    id: "googleKeywordPlanner",
    name: "Google Keyword Planner",
    category: "keywords",
    pricing: "free",
    requires: "keyword",
    build: () => `https://ads.google.com/aw/keywordplanner`,
  },
  {
    id: "googleTrends",
    name: "Google Trends",
    category: "keywords",
    pricing: "free",
    requires: "keyword",
    build: ({ keyword }) =>
      `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`,
  },
  {
    id: "answerThePublic",
    name: "AnswerThePublic",
    category: "keywords",
    pricing: "free-tier",
    requires: "keyword",
    build: ({ keyword }) =>
      `https://answerthepublic.com/reports/new?language=en&country=us&keyword=${encodeURIComponent(keyword)}`,
  },
  {
    id: "alsoAsked",
    name: "AlsoAsked",
    category: "keywords",
    pricing: "free-tier",
    requires: "keyword",
    build: ({ keyword }) =>
      `https://alsoasked.com/search?term=${encodeURIComponent(keyword)}&language=en&region=us`,
  },
  {
    id: "keyworddit",
    name: "Keyworddit (Reddit-mined)",
    category: "keywords",
    pricing: "free",
    requires: "keyword",
    build: () => `https://keyworddit.com/`,
  },

  // === Performance / Core Web Vitals ===
  {
    id: "pageSpeedInsights",
    name: "Google PageSpeed Insights",
    category: "performance",
    pricing: "free",
    requires: "fullUrl",
    build: ({ fullUrl }) =>
      `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(fullUrl)}`,
  },
  {
    id: "gtmetrix",
    name: "GTmetrix",
    category: "performance",
    pricing: "free-tier",
    requires: "fullUrl",
    build: ({ fullUrl }) =>
      `https://gtmetrix.com/?url=${encodeURIComponent(fullUrl)}`,
  },
  {
    id: "webPageTest",
    name: "WebPageTest",
    category: "performance",
    pricing: "free",
    requires: "fullUrl",
    build: ({ fullUrl }) =>
      `https://www.webpagetest.org/?url=${encodeURIComponent(fullUrl)}`,
  },
  {
    id: "mobileFriendlyTest",
    name: "Google Mobile-Friendly Test",
    category: "performance",
    pricing: "free",
    requires: "fullUrl",
    build: ({ fullUrl }) =>
      `https://search.google.com/test/mobile-friendly?url=${encodeURIComponent(fullUrl)}`,
  },

  // === Schema / structured data ===
  {
    id: "richResultsTest",
    name: "Google Rich Results Test",
    category: "schema",
    pricing: "free",
    requires: "fullUrl",
    build: ({ fullUrl }) =>
      `https://search.google.com/test/rich-results?url=${encodeURIComponent(fullUrl)}`,
  },
  {
    id: "schemaValidator",
    name: "Schema.org Validator",
    category: "schema",
    pricing: "free",
    requires: "fullUrl",
    build: ({ fullUrl }) =>
      `https://validator.schema.org/#url=${encodeURIComponent(fullUrl)}`,
  },

  // === Security ===
  {
    id: "mozillaObservatory",
    name: "Mozilla Observatory",
    category: "security",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://developer.mozilla.org/en-US/observatory/analyze?host=${encodeURIComponent(hostname)}`,
  },
  {
    id: "ssllabs",
    name: "Qualys SSL Labs",
    category: "security",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(hostname)}&hideResults=on`,
  },
  {
    id: "securityHeaders",
    name: "SecurityHeaders.com",
    category: "security",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://securityheaders.com/?q=${encodeURIComponent(hostname)}&followRedirects=on`,
  },

  // === Indexing + crawl ===
  {
    id: "searchConsole",
    name: "Google Search Console",
    category: "indexing",
    pricing: "free",
    requires: "hostname",
    build: () => `https://search.google.com/search-console`,
  },
  {
    id: "bingWebmaster",
    name: "Bing Webmaster Tools",
    category: "indexing",
    pricing: "free",
    requires: "hostname",
    build: () => `https://www.bing.com/webmasters/home`,
  },
  {
    id: "bingSiteSearch",
    name: "Bing site: search",
    category: "indexing",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://www.bing.com/search?q=site%3A${encodeURIComponent(hostname)}`,
  },
  {
    id: "googleSiteSearch",
    name: "Google site: search",
    category: "indexing",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://www.google.com/search?q=site%3A${encodeURIComponent(hostname)}`,
  },

  // === History + ownership ===
  {
    id: "waybackMachine",
    name: "Wayback Machine",
    category: "history",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://web.archive.org/web/*/${encodeURIComponent(hostname)}`,
  },
  {
    id: "icannWhois",
    name: "ICANN Whois Lookup",
    category: "history",
    pricing: "free",
    requires: "hostname",
    build: ({ hostname }) =>
      `https://lookup.icann.org/en/lookup?name=${encodeURIComponent(hostname)}`,
  },

  // === AI search visibility ===
  {
    id: "perplexity",
    name: "Perplexity",
    category: "aiSearch",
    pricing: "free-tier",
    requires: "keyword",
    build: ({ keyword }) =>
      `https://www.perplexity.ai/search?q=${encodeURIComponent(keyword)}`,
  },
  {
    id: "chatgpt",
    name: "ChatGPT (web search)",
    category: "aiSearch",
    pricing: "free-tier",
    requires: "keyword",
    build: ({ keyword }) =>
      `https://chatgpt.com/?q=${encodeURIComponent(keyword)}`,
  },
  {
    id: "googleAio",
    name: "Google AI Overviews check",
    category: "aiSearch",
    pricing: "free",
    requires: "keyword",
    build: ({ keyword }) =>
      `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
  },
];

const categories = Array.from(new Set(tools.map((tool) => tool.category)));

const pricingTone: Record<Tool["pricing"], string> = {
  free: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "free-tier": "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  "paid-trial": "bg-amber-500/15 text-amber-300 ring-amber-500/30",
};

function normalize(input: string): {
  hostname: string;
  fullUrl: string;
  keyword: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return { hostname: "", fullUrl: "", keyword: "" };

  // If it looks like a URL or domain, parse it
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmed);
  if (looksLikeUrl) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
      );
      return {
        hostname: url.hostname.replace(/^www\./, ""),
        fullUrl: url.toString(),
        keyword: trimmed,
      };
    } catch {
      // fall through
    }
  }

  // Treat as keyword
  return { hostname: "", fullUrl: "", keyword: trimmed };
}

export default function ExternalToolsLaunchpadPage() {
  const t = useTranslations("tools.ui.external");
  const tCommon = useTranslations("tools.common");
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<"all" | "domain" | "keyword">("all");

  const ctx = useMemo(() => normalize(input), [input]);
  const hasUrl = !!ctx.hostname;
  const hasKw = !!ctx.keyword;

  const visibleTools = tools.filter((tool) => {
    if (filter === "domain") return tool.requires !== "keyword";
    if (filter === "keyword") return tool.requires === "keyword";
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {tCommon("allTools")}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/30">
            <Globe className="size-5 text-cyan-300" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-gradient-brand">{t("title")}</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.rich("intro", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </header>

      {/* Single input */}
      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <Label htmlFor="ext-input" className="text-sm">
          {t("inputLabel")}
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="ext-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("inputPlaceholder")}
            className="flex-1"
          />
          {input && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setInput("")}
            >
              {t("clear")}
            </Button>
          )}
        </div>
        {input && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              {t("detectedHostname")}{" "}
              <span className={hasUrl ? "text-emerald-300" : "text-rose-300/80"}>
                {ctx.hostname || t("noneKeywordOnly")}
              </span>
            </span>
            <span>
              {t("detectedUrl")}{" "}
              <span className={hasUrl ? "text-emerald-300" : "text-rose-300/80"}>
                {ctx.fullUrl || t("none")}
              </span>
            </span>
            <span>
              {t("asKeyword")}{" "}
              <span className="text-cyan-300">{ctx.keyword || t("none")}</span>
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1 rounded-full bg-white/5 p-0.5 ring-1 ring-inset ring-white/10 w-fit">
          {(["all", "domain", "keyword"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? "rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-medium text-foreground"
                  : "rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {f === "all"
                ? t("filterAll")
                : f === "domain"
                  ? t("filterDomain")
                  : t("filterKeyword")}
            </button>
          ))}
        </div>
      </section>

      {!input && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-3 text-sm text-muted-foreground">
          <Search className="mr-2 inline size-4 text-cyan-300" />
          {t("emptyHint")}
        </div>
      )}

      {/* Tools by category */}
      {categories
        .filter((cat) => visibleTools.some((tool) => tool.category === cat))
        .map((cat) => {
          const items = visibleTools.filter((tool) => tool.category === cat);
          return (
            <section
              key={cat}
              className="glass-apple relative overflow-hidden rounded-2xl"
            >
              <header className="border-b border-white/[0.06] px-5 py-3.5">
                <h2 className="text-base font-semibold">{t(`categories.${cat}`)}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {t("toolCount", { count: items.length })}
                </p>
              </header>
              <ul className="divide-y divide-white/[0.04]">
                {items.map((tool) => {
                  const requirementMet =
                    (tool.requires === "hostname" && hasUrl) ||
                    (tool.requires === "fullUrl" && hasUrl) ||
                    (tool.requires === "keyword" && hasKw);
                  const link = requirementMet
                    ? tool.build(ctx)
                    : tool.build({ hostname: "", fullUrl: "", keyword: "" });
                  const disabled = !!input && !requirementMet;
                  return (
                    <li
                      key={tool.name}
                      className={`px-5 py-3 text-sm ${disabled ? "opacity-40" : ""}`}
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className={`group flex items-start justify-between gap-3 transition-colors ${
                          disabled ? "pointer-events-none" : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium group-hover:underline">
                              {tool.name}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${pricingTone[tool.pricing]}`}
                            >
                              {t(`pricing.${tool.pricing}`)}
                            </span>
                            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground ring-1 ring-inset ring-white/10">
                              {t(`needs.${tool.requires}`)}
                            </span>
                            {disabled && (
                              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300 ring-1 ring-inset ring-rose-500/30">
                                {t("inputMismatch")}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t(`desc.${tool.id}`)}
                          </p>
                        </div>
                        <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

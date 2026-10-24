import type { AuditContext, AuditResult, ScoreCap } from "@/audit/types";
import type { CheerioAPI, Element } from "cheerio";
import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { RobotsMatcher } from "@/audit/crawler/robots";
import { countWords2, extractMainContent } from "@/audit/rules/content/utils/text-extractor";
import { parseRobotsDirectives } from "@/audit/rules/core/robots-meta";

export const APP_ROOTS = ["#root", "#app", "#__next", "#__nuxt", "#__svelte"];
export function isAppShell($: CheerioAPI) {
  return APP_ROOTS.some((selector) => {
    const root = $(selector);
    return root.length > 0 && root.text().trim().length < 50 && root.children().length <= 2;
  });
}
export const VALUED_DIRECTIVES = /* @__PURE__ */ new Set([
  "max-snippet",
  "max-image-preview",
  "max-video-preview",
  "unavailable_after"
]);
export function hasGoogleNoindex({ $, headers }: Pick<AuditContext, "$" | "headers">): boolean {
  const tokens: string[] = [];
  $('meta[name="robots" i], meta[name="googlebot" i]').each((_, el: Element) => {
    tokens.push(...parseRobotsDirectives($(el).attr("content") ?? ""));
  });
  let agent: string | null = null;
  for (const segment of (headers["x-robots-tag"] ?? "").split(",")) {
    let directive = segment;
    const prefixed = /^\s*([a-z][a-z0-9_-]*)\s*:(.*)$/i.exec(segment);
    if (prefixed && !VALUED_DIRECTIVES.has(prefixed[1].toLowerCase())) {
      agent = prefixed[1].toLowerCase();
      directive = prefixed[2];
    }
    if (agent === null || agent === "googlebot") {
      tokens.push(...parseRobotsDirectives(directive));
    }
  }
  return tokens.includes("noindex") || tokens.includes("none");
}
export type PageFacts = {
  noindex: boolean;
  robotsDisallowed: boolean;
  hasTitle: boolean;
  /** null when the page is an unrendered app shell, so its word count says nothing */
  mainContentWords: number | null;
};
export type CapSet = { caps: ScoreCap[]; waived: ScoreCap[] };
export function readPageFacts(context: AuditContext): PageFacts {
  const { $, url } = context;
  const page = context.rendered$ ?? $;
  const unread = !context.rendered$ && isAppShell($);
  return {
    noindex: hasGoogleNoindex(context),
    robotsDisallowed: !new RobotsMatcher(context.robotsTxtContent ?? "", "Googlebot").isAllowed(url),
    hasTitle: page(DOCUMENT_TITLE).first().text().trim().length > 0,
    mainContentWords: unread ? null : countWords2(extractMainContent(page))
  };
}
export const MIN_CONTENT_WORDS2 = 20;
export const words2 = (n: number) => `${n} ${n === 1 ? "word" : "words"}`;
export function indexabilityCaps(
  facts: Pick<PageFacts, "noindex" | "robotsDisallowed">,
  subject = "this page",
  staging = false,
): ScoreCap[] {
  const caps: ScoreCap[] = [];
  if (facts.noindex) {
    caps.push({
      id: "noindex",
      ceiling: 20,
      reason: `A noindex directive (robots meta tag or X-Robots-Tag) keeps ${subject} out of Google's index. ` + (staging ? "Remove it at launch." : "On a staging site that is expected: audit it with --staging.")
    });
  }
  if (facts.robotsDisallowed) {
    caps.push({
      id: "robots-disallowed",
      ceiling: 20,
      reason: `robots.txt blocks Googlebot from fetching ${subject}, so search engines cannot read its content. ` + (staging ? "Remove the Disallow rule that matches it at launch." : "Remove or narrow the Disallow rule that matches it, or audit a staging site with --staging.")
    });
  }
  return caps;
}
export function contentCaps(facts: Pick<PageFacts, "mainContentWords" | "hasTitle">): ScoreCap[] {
  const caps: ScoreCap[] = [];
  const count = facts.mainContentWords;
  if (count !== null && count < MIN_CONTENT_WORDS2 && !facts.hasTitle) {
    caps.push({
      id: "empty-page",
      ceiling: 30,
      reason: `The page has no <title> and ${words2(count)} of main content: nothing for a search engine to index.`
    });
  } else if (count !== null && count < MIN_CONTENT_WORDS2) {
    caps.push({
      id: "thin-content",
      ceiling: 49,
      reason: `The page has ${words2(count)} of main content: too little for a search engine to match to any query.`
    });
  } else if (!facts.hasTitle) {
    caps.push({
      id: "no-title",
      ceiling: 69,
      reason: "The page has no <title>, which search engines use as the headline of its result; they will write one of their own."
    });
  }
  return caps;
}
export function pageCaps(facts: PageFacts, { staging = false } = {}): CapSet {
  const blocked = indexabilityCaps(facts, "this page", staging);
  return staging ? { caps: contentCaps(facts), waived: blocked } : { caps: [...blocked, ...contentCaps(facts)], waived: [] };
}
export function siteCaps(facts: PageFacts, url: string, { staging = false } = {}): CapSet {
  const blocked = indexabilityCaps(facts, `the start page (${url})`, staging);
  return staging ? { caps: [], waived: blocked } : { caps: blocked, waived: [] };
}
export function applyScoreCaps(result: AuditResult, { caps, waived }: CapSet): AuditResult {
  const binding = caps.filter((cap) => cap.ceiling < result.overallScore).sort((a, b) => a.ceiling - b.ceiling);
  const annotated = waived.length > 0 ? { ...result, waivedCaps: waived } : result;
  if (binding.length === 0) return annotated;
  return {
    ...annotated,
    overallScore: binding[0].ceiling,
    scoreCap: { uncappedScore: result.overallScore, caps: binding }
  };
}

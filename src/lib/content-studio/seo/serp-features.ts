// Detect SERP features by scraping a Bing search results page.
// Bing exposes most major feature types in HTML form.

import * as cheerio from "cheerio";
import { peopleAlsoAsk } from "./paa";

export type SerpFeature =
  | "featured_snippet"
  | "paa"
  | "shopping"
  | "map_pack"
  | "video_carousel"
  | "image_pack"
  | "knowledge_panel"
  | "top_stories"
  | "twitter_box";

export interface SerpFeaturesResult {
  keyword: string;
  features: SerpFeature[];
  total_results_indicator: string | null;
  notes: string[];
  /**
   * False when the SERP HTML contained no recognisable feature markup at all.
   * In that case an empty `features` list means "could not detect", NOT
   * "this keyword has no SERP features" — the two must not be conflated.
   */
  markupDetected: boolean;
}

export async function detectSerpFeatures(keyword: string): Promise<SerpFeaturesResult> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`;
  const notes: string[] = [];
  try {
    const r = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9"
      }
    });
    if (!r.ok) {
      return {
        keyword,
        features: [],
        total_results_indicator: null,
        notes: [`HTTP ${r.status}`],
        markupDetected: false
      };
    }
    const html = await r.text();
    const $ = cheerio.load(html);

    const features: SerpFeature[] = [];

    // Featured snippet — Bing uses ".b_ans" or ".b_focusLabel"
    if ($(".b_ans .b_snippet, .b_focusLabel, .rwrl_padref").length > 0) features.push("featured_snippet");

    // Shopping carousel
    if ($(".pa_carousel, .shop_carousel, [data-priority='shopping']").length > 0) features.push("shopping");

    // Map pack / local
    if ($(".b_localPOIvg, .lo_hl, [data-priority='maps']").length > 0) features.push("map_pack");

    // Video carousel
    if ($(".vidthumb, .b_vlist2col, .b_videoSearchCarousel").length > 0) features.push("video_carousel");

    // Image pack
    if ($(".imgpt, .b_imagePair, .b_imagepair").length > 0) features.push("image_pack");

    // Knowledge panel / entity card
    if ($(".b_entityTP, .lite_entityCard, .b_factrow").length > 0) features.push("knowledge_panel");

    // Top stories / news
    if ($(".na_n, .news-card, .b_topnews").length > 0) features.push("top_stories");

    // Twitter / X
    if ($(".b_twtrCard, .twitter").length > 0) features.push("twitter_box");

    // Whether the page carried ANY of the module markup we know how to read.
    // Bing has been serving result-only HTML to non-browser clients, in which
    // case none of the selectors above can fire and an empty feature list is
    // "unknown", not "none".
    // Only *feature module* containers count here. Per-result chrome such as
    // .b_attribution appears on every SERP and would make this always true.
    const markupDetected =
      features.length > 0 ||
      $(".b_ans, .b_rich, .b_entityTP, .b_localPOIvg, .b_topnews, .pa_carousel, .b_subModule")
        .length > 0;

    // PAA is detected independently of the SERP markup: the question source
    // (autocomplete) is reachable even when Bing ships no PAA module.
    try {
      const questions = await peopleAlsoAsk(keyword, 4);
      if (questions.length >= 3 && !features.includes("paa")) features.push("paa");
    } catch {
      /* question lookup is best-effort */
    }

    if (!markupDetected) {
      notes.push(
        "Bing served result-only HTML for this query, so snippet/shopping/video/local modules could not be inspected. Items below marked 'not detected' are unknown, not confirmed absent."
      );
    }

    const totalIndicator = $(".sb_count").first().text().trim() || null;

    return { keyword, features, total_results_indicator: totalIndicator, notes, markupDetected };
  } catch (e) {
    return {
      keyword,
      features: [],
      total_results_indicator: null,
      notes: [(e as Error).message],
      markupDetected: false
    };
  }
}

import * as cheerio from "cheerio";
import { unwrapSerpUrl, isSearchEngineUrl } from "./serp-url";
export type { SerpResult } from "../types";
import type { SerpResult } from "../types";


export async function bingSerp(query: string): Promise<SerpResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10`;
  try {
    const r = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9"
      }
    });
    if (!r.ok) return [];
    const html = await r.text();
    const $ = cheerio.load(html);
    const results: SerpResult[] = [];
    $("li.b_algo").each((i, el) => {
      const title = $(el).find("h2").text().trim();
      const href = $(el).find("h2 a").attr("href") || "";
      const snippet = $(el).find(".b_caption p, .b_paractl").first().text().trim();
      if (!title || !href.startsWith("http")) return;
      // Bing wraps every organic href in its /ck/a click tracker. Decode it —
      // otherwise every result looks like it lives on bing.com.
      const url = unwrapSerpUrl(href);
      if (isSearchEngineUrl(url)) return; // undecodable tracker; drop rather than mislead
      // `i` is the index among organic results, so it is the true SERP position.
      results.push({ position: i + 1, title, url, snippet });
    });
    return results.slice(0, 10);
  } catch {
    return [];
  }
}

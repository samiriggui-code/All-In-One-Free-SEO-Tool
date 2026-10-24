import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";
import { extractJsonLdScripts, extractTypedItems2 } from "@/audit/rules/schema/utils";

export function day(value: string|undefined) {
  if (typeof value !== "string") return null;
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}
export function sameResource(left: string|URL, right: string|URL) {
  try {
    const a = new URL(left);
    const b = new URL(right);
    const path3 = (value: string) => value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
    return a.origin === b.origin && path3(a.pathname) === path3(b.pathname);
  } catch {
    return left === right;
  }
}
export const sitemapDateDriftRule = defineRule({
  id: "crawl-sitemap-date-drift",
  name: "Sitemap Date Drift",
  description: "Checks that sitemap lastmod and schema dateModified fall on the same day",
  category: "crawl",
  weight: 4,
  run: (context) => {
    if (!context.sitemapEntries) {
      return notMeasured(
        "crawl-sitemap-date-drift",
        "Sitemap entries were not fetched, so lastmod cannot be compared with dateModified"
      );
    }
    let modified = null;
    for (const script of extractJsonLdScripts(context.$)) {
      for (const item of extractTypedItems2(script)) {
        modified = day(item.data.dateModified);
        if (modified) break;
      }
      if (modified) break;
    }
    const entry = context.sitemapEntries.find((item) => sameResource(item.loc, context.url));
    const lastmod = day(entry?.lastmod);
    if (!modified || !lastmod) {
      return pass("crawl-sitemap-date-drift", "No lastmod and dateModified pair to compare", {
        modified,
        lastmod
      });
    }
    if (modified === lastmod) {
      return pass("crawl-sitemap-date-drift", `lastmod and dateModified are both ${modified}`, {
        modified,
        lastmod
      });
    }
    return warn(
      "crawl-sitemap-date-drift",
      `Sitemap lastmod ${lastmod} disagrees with schema dateModified ${modified}`,
      {
        modified,
        lastmod,
        recommendation: "Make lastmod and dateModified the same day, or stop publishing the one that is stale."
      }
    );
  }
});

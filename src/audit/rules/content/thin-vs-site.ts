import { countWords2, extractMainContent } from "@/audit/rules/content/utils/text-extractor";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";
import { pageKindFrom } from "@/audit/rules/content/page-kind";

export const MIN_SAMPLE = 4;
export const OUTLIER_RATIO = 0.5;
export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
export const thinVsSiteRule = defineRule({
  id: "content-thin-vs-site",
  name: "Thin Versus Site Norm",
  description: "Checks that a page is not far shorter than the median page of the same kind",
  category: "content",
  weight: 4,
  run: (context) => {
    const pages = context.site?.pages;
    if (!pages || (context.site?.pageCount ?? 0) < MIN_SAMPLE) {
      return notMeasured(
        "content-thin-vs-site",
        "Comparing length with the rest of the site needs a crawl of at least four pages"
      );
    }
    const key = context.site!.normalize(context.url);
    const own = pages.get(key);
    const kind = own?.pageKind ?? pageKindFrom([], context.url);
    const words3 = own?.wordCount ?? countWords2(extractMainContent(context.$));
    const sample: number[] = [];
    for (const info of pages.values()) {
      if ((info.pageKind ?? "other") !== kind) continue;
      if (typeof info.wordCount === "number") sample.push(info.wordCount);
    }
    if (sample.length < MIN_SAMPLE) {
      return pass("content-thin-vs-site", `Fewer than ${MIN_SAMPLE} ${kind} pages to compare`, {
        kind,
        words: words3,
        sample: sample.length
      });
    }
    const typical = median(sample);
    if (words3 >= typical * OUTLIER_RATIO) {
      return pass("content-thin-vs-site", `${words3} words is within the ${kind} median of ${Math.round(typical)}`, {
        kind,
        words: words3,
        median: typical
      });
    }
    return warn(
      "content-thin-vs-site",
      `${words3} words is under half the ${kind} median of ${Math.round(typical)}`,
      {
        kind,
        words: words3,
        median: typical,
        recommendation: `Bring this ${kind} page toward the length of the other ${kind} pages, about ${Math.round(typical)} words.`
      }
    );
  }
});

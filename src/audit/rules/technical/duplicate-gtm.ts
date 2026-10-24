import type { CheerioAPI } from "cheerio";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const GTM_ID_PATTERN = /\bGTM-[A-Z0-9]+\b/g;
export function collectGtmContainerIds($: CheerioAPI) {
  const ids = /* @__PURE__ */ new Set();
  $("script").each((_, script) => {
    const src = $(script).attr("src") ?? "";
    const inline = $(script).html() ?? "";
    for (const text of [src, inline]) {
      const matches = text.match(GTM_ID_PATTERN);
      if (matches) {
        for (const id of matches) {
          ids.add(id);
        }
      }
    }
  });
  return [...ids].sort();
}
export const duplicateGtmRule = defineRule({
  id: "technical-duplicate-gtm",
  name: "Multiple Google Tag Manager Containers",
  description: "Detects pages embedding more than one distinct Google Tag Manager container ID",
  category: "technical",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    if (!$) {
      return notMeasured(
        "technical-duplicate-gtm",
        "Page HTML was not collected; cannot scan for Tag Manager containers"
      );
    }
    const containerIds = collectGtmContainerIds($);
    if (containerIds.length > 1) {
      return warn(
        "technical-duplicate-gtm",
        `Page contains ${containerIds.length} distinct Google Tag Manager containers: ${containerIds.join(", ")}`,
        {
          containerIds,
          fix: "Verify all containers are intentional; consolidate into a single container where possible"
        }
      );
    }
    return pass(
      "technical-duplicate-gtm",
      containerIds.length === 1 ? `Page contains a single Google Tag Manager container: ${containerIds[0]}` : "No Google Tag Manager containers found",
      { containerIds }
    );
  }
});

import type { CheerioAPI } from "cheerio";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS = {
  nodes: { good: 800, warning: 1500 },
  depth: { good: 32, warning: 48 },
  children: { good: 60 }
};
export function calculateDomStats($: CheerioAPI) {
  let totalNodes = 0;
  let maxDepth = 0;
  let maxChildren = 0;
  let deepestSelector = "";
  let widestSelector = "";
  $("body *").each((_, el) => {
    totalNodes++;
    let depth = 0;
    let parent = $(el).parent();
    while (parent.length && parent[0] && parent[0].tagName !== "html") {
      depth++;
      parent = parent.parent();
    }
    if (depth > maxDepth) {
      maxDepth = depth;
      const tagName = el.tagName?.toLowerCase() || "unknown";
      const id = $(el).attr("id");
      const className = $(el).attr("class")?.split(" ")[0];
      deepestSelector = id ? `${tagName}#${id}` : className ? `${tagName}.${className}` : tagName;
    }
    const childCount = $(el).children().length;
    if (childCount > maxChildren) {
      maxChildren = childCount;
      const tagName = el.tagName?.toLowerCase() || "unknown";
      const id = $(el).attr("id");
      const className = $(el).attr("class")?.split(" ")[0];
      widestSelector = id ? `${tagName}#${id}` : className ? `${tagName}.${className}` : tagName;
    }
  });
  return { totalNodes, maxDepth, maxChildren, deepestSelector, widestSelector };
}
export const domSizeRule = defineRule({
  id: "perf-dom-size",
  name: "DOM Size",
  description: "Checks DOM size for performance impact (nodes, depth, children)",
  category: "perf",
  weight: 15,
  run: (context) => {
    const { $ } = context;
    const stats = calculateDomStats($);
    const issues = [];
    let severity = "pass";
    if (stats.totalNodes > THRESHOLDS.nodes.warning) {
      issues.push(`${stats.totalNodes.toLocaleString()} DOM nodes (recommended: <${THRESHOLDS.nodes.good})`);
      severity = "fail";
    } else if (stats.totalNodes > THRESHOLDS.nodes.good) {
      issues.push(`${stats.totalNodes.toLocaleString()} DOM nodes (recommended: <${THRESHOLDS.nodes.good})`);
      severity = "warn";
    }
    if (stats.maxDepth > THRESHOLDS.depth.warning) {
      issues.push(`Max depth: ${stats.maxDepth} (recommended: <${THRESHOLDS.depth.good})`);
      if (severity !== "fail") severity = "fail";
    } else if (stats.maxDepth > THRESHOLDS.depth.good) {
      issues.push(`Max depth: ${stats.maxDepth} at ${stats.deepestSelector}`);
      if (severity === "pass") severity = "warn";
    }
    if (stats.maxChildren > THRESHOLDS.children.good) {
      issues.push(`Max children: ${stats.maxChildren} in ${stats.widestSelector} (recommended: <${THRESHOLDS.children.good})`);
      if (severity === "pass") severity = "warn";
    }
    const details = {
      totalNodes: stats.totalNodes,
      maxDepth: stats.maxDepth,
      maxChildren: stats.maxChildren,
      deepestSelector: stats.deepestSelector,
      widestSelector: stats.widestSelector,
      thresholds: THRESHOLDS
    };
    if (severity === "fail") {
      return fail("perf-dom-size", `DOM size is too large: ${issues.join("; ")}`, details);
    }
    if (severity === "warn") {
      return warn("perf-dom-size", `DOM size could be optimized: ${issues.join("; ")}`, details);
    }
    return pass(
      "perf-dom-size",
      `DOM size is optimal (${stats.totalNodes.toLocaleString()} nodes, depth ${stats.maxDepth})`,
      details
    );
  }
});

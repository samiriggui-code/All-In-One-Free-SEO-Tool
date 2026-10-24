import type { SiteContext } from "@/audit/types";
import { NEEDS_SITE_GRAPH_MESSAGE, getInboundEdges } from "@/audit/rules/links/inbound";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export function isCanonicalizedAway(site: SiteContext, from: string) {
  const canonical = site.pages?.get(from)?.canonical;
  return typeof canonical === "string" && canonical.length > 0 && site.normalize(canonical) !== from;
}
export const inboundLowQualityRule = defineRule({
  id: "links-inbound-low-quality",
  name: "Inbound Links Passing No Link Equity",
  description: "Warns when every inbound internal link is nofollow or comes from a canonicalized page, so none pass link equity",
  category: "links",
  weight: 3,
  run: (context) => {
    const edges = getInboundEdges(context);
    if (edges === null) {
      return notMeasured("links-inbound-low-quality", NEEDS_SITE_GRAPH_MESSAGE);
    }
    if (edges.length === 0) {
      return pass(
        "links-inbound-low-quality",
        "No inbound internal links - inbound link counting is covered by links-orphan-pages"
      );
    }
    const site = context.site!;
    const nofollowCount = edges.filter((edge) => edge.nofollow).length;
    const canonicalizedSourceCount = edges.filter((edge) => isCanonicalizedAway(site, edge.from)).length;
    const equityPassing = edges.filter(
      (edge) => !edge.nofollow && !isCanonicalizedAway(site, edge.from)
    );
    const details = {
      inboundEdgeCount: edges.length,
      nofollowCount,
      canonicalizedSourceCount,
      equityPassingCount: equityPassing.length
    };
    if (equityPassing.length === 0) {
      return warn(
        "links-inbound-low-quality",
        `No inbound internal link passes link equity - every link is nofollow or from a page canonicalized elsewhere`,
        {
          ...details,
          suggestion: "Earn followed links from indexable, self-canonical pages so this URL receives internal link equity"
        }
      );
    }
    return pass(
      "links-inbound-low-quality",
      `${equityPassing.length} of ${edges.length} inbound internal link(s) pass link equity`,
      details
    );
  }
});

import { NEEDS_SITE_GRAPH_MESSAGE, getInboundEdges } from "@/audit/rules/links/inbound";
import { NON_DESCRIPTIVE_PATTERNS } from "@/audit/rules/links/anchor-text";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export function isGenericAnchor(anchor: string) {
  const text = anchor.trim().toLowerCase();
  if (!text || text.length < 2) return true;
  return NON_DESCRIPTIVE_PATTERNS.some(
    (pattern) => text === pattern || text === pattern + "..."
  );
}
export const inboundAnchorTextRule = defineRule({
  id: "links-inbound-anchor-text",
  name: "Descriptive Inbound Anchor Text",
  description: 'Warns when every followed internal link pointing to this page uses generic anchor text like "click here"',
  category: "links",
  weight: 2,
  run: (context) => {
    const edges = getInboundEdges(context);
    if (edges === null) {
      return notMeasured("links-inbound-anchor-text", NEEDS_SITE_GRAPH_MESSAGE);
    }
    if (edges.length === 0) {
      return pass(
        "links-inbound-anchor-text",
        "No inbound internal links - inbound link counting is covered by links-orphan-pages"
      );
    }
    const followed = edges.filter((edge) => !edge.nofollow);
    if (followed.length === 0) {
      return pass(
        "links-inbound-anchor-text",
        "No followed inbound internal links - covered by links-inbound-all-nofollow"
      );
    }
    const generic = followed.filter((edge) => isGenericAnchor(edge.anchor));
    const details = {
      followedInboundCount: followed.length,
      genericAnchorCount: generic.length,
      genericAnchors: generic.map((edge) => ({ from: edge.from, anchor: edge.anchor })).slice(0, 5)
    };
    if (generic.length === followed.length) {
      return warn(
        "links-inbound-anchor-text",
        `All ${followed.length} followed inbound internal link(s) use generic anchor text`,
        {
          ...details,
          suggestion: "Ask for descriptive anchor text on internal links pointing here - it tells search engines what this page is about"
        }
      );
    }
    return pass(
      "links-inbound-anchor-text",
      `${followed.length - generic.length} of ${followed.length} followed inbound internal link(s) use descriptive anchor text`,
      details
    );
  }
});

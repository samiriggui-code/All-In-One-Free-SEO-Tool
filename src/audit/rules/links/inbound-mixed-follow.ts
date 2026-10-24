import { NEEDS_SITE_GRAPH_MESSAGE, getInboundEdges } from "@/audit/rules/links/inbound";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const inboundMixedFollowRule = defineRule({
  id: "links-inbound-mixed-follow",
  name: "Mixed Follow/Nofollow Inbound Links",
  description: "Warns when a page receives both followed and nofollowed internal links, suggesting inconsistent nofollow usage",
  category: "links",
  weight: 2,
  run: (context) => {
    const edges = getInboundEdges(context);
    if (edges === null) {
      return notMeasured("links-inbound-mixed-follow", NEEDS_SITE_GRAPH_MESSAGE);
    }
    if (edges.length === 0) {
      return pass(
        "links-inbound-mixed-follow",
        "No inbound internal links - inbound link counting is covered by links-orphan-pages"
      );
    }
    const nofollowCount = edges.filter((edge) => edge.nofollow).length;
    const followedCount = edges.length - nofollowCount;
    const details = {
      inboundEdgeCount: edges.length,
      nofollowCount,
      followedCount,
      nofollowFrom: edges.filter((edge) => edge.nofollow).map((edge) => edge.from).slice(0, 5)
    };
    if (nofollowCount > 0 && followedCount > 0) {
      return warn(
        "links-inbound-mixed-follow",
        `Receives both followed (${followedCount}) and nofollowed (${nofollowCount}) internal links`,
        {
          ...details,
          suggestion: "Decide whether internal links to this page should be nofollowed and apply it consistently"
        }
      );
    }
    return pass(
      "links-inbound-mixed-follow",
      nofollowCount === 0 ? `All ${edges.length} inbound internal link(s) are followed` : "All inbound internal links are nofollow - covered by links-inbound-all-nofollow",
      details
    );
  }
});

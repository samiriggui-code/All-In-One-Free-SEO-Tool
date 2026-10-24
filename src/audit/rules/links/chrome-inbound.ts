import { NEEDS_SITE_GRAPH_MESSAGE, getInboundEdges } from "@/audit/rules/links/inbound";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const chromeInboundRule = defineRule({
  id: "links-chrome-inbound",
  name: "Chrome-Only Inbound Links",
  description: "Checks that a page has at least one inbound internal link outside nav, header, and footer",
  category: "links",
  weight: 4,
  run: (context) => {
    const edges = getInboundEdges(context);
    if (!edges) {
      return notMeasured("links-chrome-inbound", NEEDS_SITE_GRAPH_MESSAGE);
    }
    if (edges.length === 0) {
      return pass("links-chrome-inbound", "No inbound links to classify (orphan rules cover that case)", {
        inbound: 0
      });
    }
    if (edges.some((edge) => edge.chrome === void 0)) {
      return notMeasured(
        "links-chrome-inbound",
        "Inbound edges do not record whether the link was in site chrome"
      );
    }
    const editorial = edges.filter((edge) => edge.chrome === false);
    if (editorial.length > 0) {
      return pass("links-chrome-inbound", `${editorial.length} inbound link(s) sit outside site chrome`, {
        editorial: editorial.length,
        inbound: edges.length
      });
    }
    return warn("links-chrome-inbound", "Every inbound internal link is in the nav, header, or footer", {
      inbound: edges.length,
      recommendation: "Link to this page from body copy on a relevant page, not only from sitewide chrome."
    });
  }
});

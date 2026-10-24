import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType, hasField } from "@/audit/rules/schema/utils";

export const structuredDataWebsiteSearchRule = defineRule({
  id: "schema-website-search",
  name: "WebSite Search Schema",
  description: "Checks for WebSite schema with sitelinks searchbox eligibility",
  category: "schema",
  weight: 8,
  run: (context) => {
    const { $, url } = context;
    const urlObj = new URL(url);
    const isHomepage = urlObj.pathname === "/" || urlObj.pathname === "";
    const websites = findItemsByType($, "WebSite");
    if (websites.length === 0) {
      if (isHomepage) {
        return warn("schema-website-search", "Homepage missing WebSite schema", {
          isHomepage: true,
          suggestion: "Add WebSite schema to enable sitelinks searchbox"
        });
      }
      return pass("schema-website-search", "Non-homepage - WebSite schema not required here", {
        isHomepage: false
      });
    }
    const issues = [];
    let hasSearchAction = false;
    for (const site of websites) {
      if (!hasField(site, "name")) {
        issues.push("WebSite missing name");
      }
      if (!hasField(site, "url")) {
        issues.push("WebSite missing url");
      }
      if (hasField(site, "potentialAction")) {
        const actions = site.data.potentialAction;
        const actionList = Array.isArray(actions) ? actions : [actions];
        for (const action of actionList) {
          if (typeof action !== "object" || action === null) continue;
          const a = action;
          if (a["@type"] === "SearchAction") {
            hasSearchAction = true;
            if (!a.target) {
              issues.push("SearchAction missing target");
            } else {
              const target = a.target;
              if (typeof target === "string" && !target.includes("{search_term_string}")) {
                issues.push("SearchAction target should include {search_term_string}");
              } else if (typeof target === "object" && target !== null) {
                const t = target;
                const urlTemplate = t.urlTemplate;
                if (urlTemplate && !urlTemplate.includes("{search_term_string}")) {
                  issues.push("SearchAction urlTemplate should include {search_term_string}");
                }
              }
            }
            if (!a["query-input"] && !a.query) {
              issues.push("SearchAction missing query-input");
            }
          }
        }
      }
    }
    if (issues.length > 0) {
      return warn("schema-website-search", issues.join("; "), {
        websiteCount: websites.length,
        hasSearchAction,
        issues
      });
    }
    if (!hasSearchAction) {
      return warn("schema-website-search", "WebSite found but no SearchAction for sitelinks searchbox", {
        websiteCount: websites.length,
        hasSearchAction: false,
        suggestion: "Add potentialAction with SearchAction for sitelinks searchbox eligibility"
      });
    }
    return pass("schema-website-search", "WebSite schema with SearchAction properly configured", {
      websiteCount: websites.length,
      hasSearchAction: true
    });
  }
});

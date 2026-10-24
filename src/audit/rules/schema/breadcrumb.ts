import type { CheerioAPI } from "cheerio";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { findItemsByType, hasField } from "@/audit/rules/schema/utils";

export function markupBreadcrumb(syntax: string, itemCount: number) {
  return itemCount === 0 ? { syntax, itemCount, problem: `BreadcrumbList (${syntax}) missing itemListElement` } : { syntax, itemCount };
}
export function findMarkupBreadcrumbs($: CheerioAPI) {
  const found: ({ syntax: string; itemCount: number; problem: string; }|{ syntax: string; itemCount: number; problem?: undefined; })[] = [];
  $('[typeof~="BreadcrumbList"]').each((_, el) => {
    found.push(markupBreadcrumb("RDFa", $(el).find('[property~="itemListElement"]').length));
  });
  $('[itemscope][itemtype$="/BreadcrumbList"]').each((_, el) => {
    found.push(markupBreadcrumb("microdata", $(el).find('[itemprop~="itemListElement"]').length));
  });
  return found;
}
export const structuredDataBreadcrumbRule = defineRule({
  id: "schema-breadcrumb",
  name: "Breadcrumb Schema",
  description: "Validates BreadcrumbList schema presence on non-homepage pages and checks for proper itemListElement structure",
  category: "schema",
  weight: 8,
  run: async (context) => {
    const { $, url } = context;
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const isHomepage = pathname === "/" || pathname === "";
    const breadcrumbs = [
      ...findItemsByType($, "BreadcrumbList").map((item) => {
        if (!hasField(item, "itemListElement")) {
          return { syntax: "JSON-LD", itemCount: 0, problem: "BreadcrumbList missing itemListElement" };
        }
        const itemListElement = item.data.itemListElement;
        return Array.isArray(itemListElement) ? { syntax: "JSON-LD", itemCount: itemListElement.length } : { syntax: "JSON-LD", itemCount: 0, problem: "itemListElement should be an array" };
      }),
      ...findMarkupBreadcrumbs($)
    ];
    if (breadcrumbs.length === 0) {
      if (isHomepage) {
        return pass(
          "schema-breadcrumb",
          "Homepage - breadcrumb not required",
          { isHomepage: true, breadcrumbsFound: 0 }
        );
      }
      return warn(
        "schema-breadcrumb",
        "Non-homepage missing BreadcrumbList schema",
        { isHomepage: false, breadcrumbsFound: 0, pathname }
      );
    }
    const syntax = [...new Set(breadcrumbs.map((breadcrumb) => breadcrumb.syntax))];
    const issues = [];
    for (const breadcrumb of breadcrumbs) {
      if (breadcrumb.problem) {
        issues.push(breadcrumb.problem);
      } else if (breadcrumb.itemCount < 2) {
        issues.push(
          `BreadcrumbList should have at least 2 items, found ${breadcrumb.itemCount}`
        );
      }
    }
    if (issues.length > 0) {
      return warn(
        "schema-breadcrumb",
        `BreadcrumbList validation issues: ${issues.join("; ")}`,
        {
          breadcrumbsFound: breadcrumbs.length,
          syntax,
          issues,
          isHomepage
        }
      );
    }
    return pass(
      "schema-breadcrumb",
      `Valid BreadcrumbList schema found with proper structure (${syntax.join(", ")})`,
      {
        breadcrumbsFound: breadcrumbs.length,
        syntax,
        isHomepage
      }
    );
  }
});

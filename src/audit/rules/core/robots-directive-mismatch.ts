import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { parseRobotsDirectives } from "@/audit/rules/core/robots-meta";

export function summarizeDirectives(tokens: string[]) {
  const expanded = tokens.flatMap(
    (t) => t === "none" ? ["noindex", "nofollow"] : t === "all" ? ["index", "follow"] : [t]
  );
  return {
    noindex: expanded.includes("noindex"),
    index: expanded.includes("index"),
    nofollow: expanded.includes("nofollow"),
    follow: expanded.includes("follow")
  };
}
export function parseHeaderDirectives(headerValue: string) {
  const segments = headerValue.split(",").map((s) => s.trim()).filter((s) => s.length > 0 && !/^[a-z0-9_*-]+:/i.test(s));
  return parseRobotsDirectives(segments.join(","));
}
export const robotsDirectiveMismatchRule = defineRule({
  id: "core-robots-directive-mismatch",
  name: "Robots Directive Mismatch",
  description: "Checks that robots directives in meta tags and the X-Robots-Tag header are consistent and not duplicated",
  category: "core",
  weight: 5,
  run: async (context) => {
    const { $, headers } = context;
    const htmlDeclarations: Array<{ noindex: boolean; index: boolean; nofollow: boolean; follow: boolean; }> = [];
    $('meta[name="robots"]').each((_, el) => {
      const content = $(el).attr("content") || "";
      htmlDeclarations.push(summarizeDirectives(parseRobotsDirectives(content)));
    });
    const html = {
      noindex: htmlDeclarations.some((d) => d.noindex),
      index: htmlDeclarations.some((d) => d.index),
      nofollow: htmlDeclarations.some((d) => d.nofollow),
      follow: htmlDeclarations.some((d) => d.follow)
    };
    const htmlNoindexCount = htmlDeclarations.filter((d) => d.noindex).length;
    const htmlNofollowCount = htmlDeclarations.filter((d) => d.nofollow).length;
    const headerValue = headers["x-robots-tag"] || headers["X-Robots-Tag"] || "";
    const header = headerValue ? summarizeDirectives(parseHeaderDirectives(headerValue)) : null;
    const noindexLocations = htmlNoindexCount + (header?.noindex ? 1 : 0);
    const nofollowLocations = htmlNofollowCount + (header?.nofollow ? 1 : 0);
    if (htmlDeclarations.length === 0 && !header) {
      return pass(
        "core-robots-directive-mismatch",
        "No robots directives declared in HTML or HTTP header",
        { htmlDeclarations: 0, header: null }
      );
    }
    const mismatches = [];
    if (header) {
      if (html.noindex && header.index && !header.noindex || header.noindex && html.index && !html.noindex) {
        mismatches.push("noindex");
      }
      if (html.nofollow && header.follow && !header.nofollow || header.nofollow && html.follow && !html.nofollow) {
        mismatches.push("nofollow");
      }
    }
    if (mismatches.length > 0) {
      return fail(
        "core-robots-directive-mismatch",
        `Conflicting robots directives between HTML and X-Robots-Tag header: ${mismatches.join(", ")}`,
        {
          mismatches,
          htmlDeclarations,
          header,
          impact: "Conflicting directives resolve to the most restrictive option, so the page may stay noindexed or nofollowed despite the permissive declaration",
          recommendation: "Declare robots directives in one location only and make them agree"
        }
      );
    }
    const duplicates = [];
    if (noindexLocations > 1) {
      duplicates.push(`noindex declared in ${noindexLocations} locations`);
    }
    if (nofollowLocations > 1) {
      duplicates.push(`nofollow declared in ${nofollowLocations} locations`);
    }
    if (duplicates.length > 0) {
      return warn(
        "core-robots-directive-mismatch",
        `Robots directives declared multiple times: ${duplicates.join("; ")}`,
        {
          duplicates,
          htmlDeclarations,
          header,
          impact: "Duplicated directives agree today but make future configuration errors likely",
          recommendation: "Declare each robots directive once, in either the HTML or the HTTP header"
        }
      );
    }
    return pass(
      "core-robots-directive-mismatch",
      "Robots directives are consistent between HTML and HTTP header",
      { htmlDeclarations, header }
    );
  }
});

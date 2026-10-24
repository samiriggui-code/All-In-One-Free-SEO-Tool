import type { CheerioAPI, Element } from "cheerio";
import { defineRule } from "@/audit/engine/define-rule";

export const ABOUT_PATTERNS = {
  // Link text patterns (case insensitive)
  linkText: [
    /^about\s*us$/i,
    /^about$/i,
    /^about\s+the\s+(company|team|author)/i,
    /^who\s+we\s+are$/i,
    /^our\s+(story|mission|team|company)$/i,
    /^meet\s+the\s+team$/i,
    /^\u00fcber\s*uns$/i,
    // German
    /^qui\s+sommes[-\s]nous$/i,
    // French
    /^sobre\s+nosotros$/i,
    // Spanish
    /^chi\s+siamo$/i
    // Italian
  ],
  // URL path patterns
  urlPaths: [
    /\/about[-_]?us\/?$/i,
    /\/about\/?$/i,
    /\/company\/?$/i,
    /\/who[-_]?we[-_]?are\/?$/i,
    /\/our[-_]?(story|team|mission)\/?$/i,
    /\/meet[-_]?the[-_]?team\/?$/i
  ]
};
export const aboutPageRule = defineRule({
  id: "eeat-about-page",
  name: "About Page",
  description: "Checks for an about/company page with content",
  category: "eeat",
  weight: 8,
  run(context) {
    const { $ } = context;
    const foundLinks: { href: string; text: string; location: string; }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      if (!href || href.startsWith("http") && !href.includes(context.url)) {
        if (href.startsWith("http")) return;
      }
      for (const pattern of ABOUT_PATTERNS.linkText) {
        if (pattern.test(text)) {
          const location = detectLocation($, el);
          foundLinks.push({ href, text: text.slice(0, 50), location });
          return;
        }
      }
      for (const pattern of ABOUT_PATTERNS.urlPaths) {
        if (pattern.test(href)) {
          const location = detectLocation($, el);
          foundLinks.push({ href, text: text.slice(0, 50) || "About", location });
          return;
        }
      }
    });
    const navAbout = $('nav a, header a, [role="navigation"] a').filter((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const href = $(el).attr("href") || "";
      return text.includes("about") || /\/about/i.test(href);
    });
    if (navAbout.length > 0 && foundLinks.length === 0) {
      navAbout.each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        foundLinks.push({ href, text, location: "navigation" });
      });
    }
    if (foundLinks.length > 0) {
      const inNav = foundLinks.some(
        (link) => link.location === "navigation" || link.location === "header"
      );
      return {
        ruleId: "eeat-about-page",
        status: "pass",
        score: 100,
        message: `About page link found${inNav ? " in navigation" : ""}`,
        details: {
          hasAboutPage: true,
          inNavigation: inNav,
          links: foundLinks.slice(0, 3)
        }
      };
    }
    return {
      ruleId: "eeat-about-page",
      status: "warn",
      score: 50,
      message: "No about page link found - important for trust and E-E-A-T",
      details: {
        hasAboutPage: false,
        recommendation: 'Add an "About" or "About Us" page explaining who you are and link to it from your navigation'
      }
    };
  }
});
export function detectLocation($: CheerioAPI, el: Element) {
  const parents = $(el).parents();
  for (let i = 0; i < parents.length; i++) {
    const parent = parents.eq(i);
    const tagName = parent.prop("tagName")?.toLowerCase() || "";
    const className = parent.attr("class")?.toLowerCase() || "";
    const id = parent.attr("id")?.toLowerCase() || "";
    const role = parent.attr("role")?.toLowerCase() || "";
    if (tagName === "nav" || role === "navigation" || className.includes("nav")) {
      return "navigation";
    }
    if (tagName === "header" || role === "banner" || className.includes("header") || id.includes("header")) {
      return "header";
    }
    if (tagName === "footer" || role === "contentinfo" || className.includes("footer") || id.includes("footer")) {
      return "footer";
    }
  }
  return "body";
}

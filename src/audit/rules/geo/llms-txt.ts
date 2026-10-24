import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const llmsTxtRule = defineRule({
  id: "geo-llms-txt",
  name: "llms.txt Reference",
  description: "Checks if the page references an llms.txt file for AI discoverability (emerging standard)",
  category: "geo",
  weight: 15,
  run: (context) => {
    const { $ } = context;
    const references = [];
    const llmsLink = $('link[rel="llms"]');
    if (llmsLink.length > 0) {
      const href = llmsLink.first().attr("href");
      if (href) {
        references.push(`<link rel="llms" href="${href}">`);
      }
    }
    const llmsMeta = $('meta[name="llms"]');
    if (llmsMeta.length > 0) {
      const content = llmsMeta.first().attr("content");
      if (content) {
        references.push(`<meta name="llms" content="${content}">`);
      }
    }
    const llmsPaths = ["/llms.txt", "/.well-known/llms.txt"];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      for (const path3 of llmsPaths) {
        if (href === path3 || href.endsWith(path3)) {
          references.push(`<a href="${href}"> link to ${path3}`);
          return false;
        }
      }
    });
    $("link[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const rel = $(el).attr("rel") || "";
      if (rel === "llms") return;
      for (const path3 of llmsPaths) {
        if (href === path3 || href.endsWith(path3)) {
          references.push(`<link rel="${rel}" href="${href}">`);
          return false;
        }
      }
    });
    const details = {
      references,
      referenceCount: references.length,
      note: "llms.txt is an emerging standard (llmstxt.org) - not yet required but recommended for AI visibility"
    };
    if (references.length > 0) {
      return pass(
        "geo-llms-txt",
        `llms.txt reference found (${references.length} reference(s))`,
        details
      );
    }
    return warn(
      "geo-llms-txt",
      "No llms.txt reference found - consider adding for AI discoverability",
      {
        ...details,
        recommendation: 'Add <link rel="llms" href="/llms.txt"> in <head>, or create /llms.txt describing your site for LLMs (see llmstxt.org)'
      }
    );
  }
});

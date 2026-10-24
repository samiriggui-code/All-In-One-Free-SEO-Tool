import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const faviconPresentRule = defineRule({
  id: "core-favicon-present",
  name: "Favicon Present",
  description: 'Checks that a <link rel="icon"> or <link rel="shortcut icon"> tag exists',
  category: "core",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    const iconElement = $('link[rel="icon"]');
    const shortcutIconElement = $('link[rel="shortcut icon"]');
    if (iconElement.length === 0 && shortcutIconElement.length === 0) {
      return fail(
        "core-favicon-present",
        "No favicon link tag found in the document",
        { found: false }
      );
    }
    const element = iconElement.length > 0 ? iconElement.first() : shortcutIconElement.first();
    const href = element.attr("href")?.trim();
    const rel = element.attr("rel");
    if (!href) {
      return fail(
        "core-favicon-present",
        "Favicon link tag exists but has no href",
        { found: true, empty: true }
      );
    }
    return pass(
      "core-favicon-present",
      "Favicon link tag is present",
      { found: true, faviconUrl: href, rel }
    );
  }
});

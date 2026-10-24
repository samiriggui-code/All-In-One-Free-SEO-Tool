import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findOgTag, nameAttributeMessage } from "@/audit/rules/social/open-graph";

export function isValidUrl2(urlString: string|URL) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
export const ogUrlRule = defineRule({
  id: "social-og-url",
  name: "Open Graph URL",
  description: 'Checks that a <meta property="og:url"> tag exists with a valid URL',
  category: "social",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    const tag = findOgTag($, "og:url");
    if (!tag) {
      return fail(
        "social-og-url",
        'No <meta property="og:url"> tag found in the document',
        { found: false }
      );
    }
    const content = tag.content;
    if (!content) {
      return fail(
        "social-og-url",
        "Open Graph URL tag exists but has no content",
        { found: true, empty: true }
      );
    }
    if (!isValidUrl2(content)) {
      return warn(
        "social-og-url",
        `Open Graph URL is not a valid absolute URL: "${content}"`,
        { ogUrl: content, isValidUrl: false }
      );
    }
    if (tag.attribute === "name") {
      return warn(
        "social-og-url",
        nameAttributeMessage("Open Graph URL", "og:url"),
        { found: true, ogUrl: content, isValidUrl: true, attribute: "name" }
      );
    }
    return pass(
      "social-og-url",
      "Open Graph URL tag is present with a valid URL",
      { found: true, ogUrl: content, isValidUrl: true }
    );
  }
});

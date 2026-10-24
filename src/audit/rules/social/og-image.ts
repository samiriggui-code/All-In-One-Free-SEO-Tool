import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { findOgTag, nameAttributeMessage } from "@/audit/rules/social/open-graph";

export function isValidUrl(urlString: string|URL) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
export const ogImageRule = defineRule({
  id: "social-og-image",
  name: "Open Graph Image",
  description: 'Checks that a <meta property="og:image"> tag exists with a valid URL',
  category: "social",
  weight: 1,
  run: async (context) => {
    const { $ } = context;
    const tag = findOgTag($, "og:image");
    if (!tag) {
      return fail(
        "social-og-image",
        'No <meta property="og:image"> tag found in the document',
        { found: false }
      );
    }
    const content = tag.content;
    if (!content) {
      return fail(
        "social-og-image",
        "Open Graph image tag exists but has no content",
        { found: true, empty: true }
      );
    }
    if (!isValidUrl(content)) {
      return warn(
        "social-og-image",
        `Open Graph image URL is not a valid absolute URL: "${content}"`,
        { ogImage: content, isValidUrl: false }
      );
    }
    if (tag.attribute === "name") {
      return warn(
        "social-og-image",
        nameAttributeMessage("Open Graph image", "og:image"),
        { found: true, ogImage: content, isValidUrl: true, attribute: "name" }
      );
    }
    return pass(
      "social-og-image",
      "Open Graph image tag is present with a valid URL",
      { found: true, ogImage: content, isValidUrl: true }
    );
  }
});

import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function cssEscape(value: string) {
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}
export const brokenFragmentRule = defineRule({
  id: "links-broken-fragment",
  name: "No Broken Fragment Links",
  description: "Checks that internal fragment links (#id) reference existing elements on the page",
  category: "links",
  weight: 6,
  run: (context) => {
    const { links, url, $ } = context;
    let pageUrl;
    try {
      pageUrl = new URL(url);
    } catch {
      return pass(
        "links-broken-fragment",
        "Could not parse page URL, skipping fragment check"
      );
    }
    const fragmentLinks = [];
    for (const link of links) {
      if (!link.isInternal) continue;
      const hashIdx = link.href.indexOf("#");
      if (hashIdx === -1) continue;
      const fragment = link.href.slice(hashIdx + 1);
      if (!fragment) continue;
      try {
        const linkUrl = new URL(link.href);
        const isSamePage = linkUrl.hostname === pageUrl.hostname && linkUrl.pathname === pageUrl.pathname && linkUrl.search === pageUrl.search;
        if (isSamePage) {
          fragmentLinks.push({ href: link.href, fragment });
        }
      } catch {
        if (link.href.startsWith("#")) {
          fragmentLinks.push({ href: link.href, fragment });
        }
      }
    }
    if (fragmentLinks.length === 0) {
      return pass(
        "links-broken-fragment",
        "No same-page fragment links found to check",
        { fragmentLinksChecked: 0 }
      );
    }
    const uniqueFragments = [...new Set(fragmentLinks.map((f) => f.fragment))];
    const brokenFragments: string[] = [];
    for (const fragment of uniqueFragments) {
      const escaped = cssEscape(fragment);
      const byId = $(`#${escaped}`).length > 0;
      const byName = $(`[name="${escaped}"]`).length > 0;
      if (!byId && !byName) {
        brokenFragments.push(fragment);
      }
    }
    if (brokenFragments.length > 0) {
      const brokenLinks = fragmentLinks.filter((f) => brokenFragments.includes(f.fragment)).slice(0, 5);
      return warn(
        "links-broken-fragment",
        `Found ${brokenFragments.length} fragment link(s) pointing to non-existent IDs`,
        {
          brokenCount: brokenFragments.length,
          totalFragmentLinks: fragmentLinks.length,
          brokenFragments: brokenFragments.slice(0, 5),
          brokenLinks: brokenLinks.map((l) => ({
            href: l.href,
            fragment: l.fragment
          })),
          recommendation: "Add matching id attributes to target elements or update the fragment references"
        }
      );
    }
    return pass(
      "links-broken-fragment",
      `All ${fragmentLinks.length} same-page fragment link(s) have matching IDs`,
      { fragmentLinksChecked: fragmentLinks.length }
    );
  }
});

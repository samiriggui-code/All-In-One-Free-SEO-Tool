import type { CheerioAPI } from "cheerio";
import { DOCUMENT_TITLE } from "@/audit/rules/document-title";
import { countWords2, extractMainContent } from "@/audit/rules/content/utils/text-extractor";
import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { firstAttr, firstText, parityInputs } from "@/audit/rules/mobile/utils/parity";

export const mobileParityContentRule = defineRule({
  id: "mobile-parity-content",
  name: "Mobile Content Parity",
  description: "Checks that the mobile render contains as much body content as desktop",
  category: "mobile",
  weight: 10,
  run: (context) => {
    const inputs = parityInputs("mobile-parity-content", context);
    if (!inputs.available) return inputs.result;
    const desktopWords = countWords2(extractMainContent(inputs.desktop));
    const mobileWords = countWords2(extractMainContent(inputs.mobile));
    const ratio = desktopWords > 0 ? mobileWords / desktopWords : 1;
    const details = {
      desktopWords,
      mobileWords,
      ratio: Number(ratio.toFixed(2)),
      missingWords: Math.max(0, desktopWords - mobileWords)
    };
    if (desktopWords < 100) {
      return pass("mobile-parity-content", "Too little content to assess parity", details);
    }
    if (ratio < 0.5) {
      return fail(
        "mobile-parity-content",
        `Mobile shows ${mobileWords} words vs ${desktopWords} on desktop (${Math.round(ratio * 100)}%) - Google indexes the mobile version`,
        {
          ...details,
          impact: "Under mobile-first indexing, the thinner mobile page is what gets indexed and ranked. Content hidden from mobile is effectively invisible to search."
        }
      );
    }
    if (ratio < 0.8) {
      return warn(
        "mobile-parity-content",
        `Mobile shows ${Math.round(ratio * 100)}% of the desktop content (${mobileWords} vs ${desktopWords} words)`,
        details
      );
    }
    return pass(
      "mobile-parity-content",
      `Mobile and desktop content are in parity (${mobileWords} vs ${desktopWords} words)`,
      details
    );
  }
});
export const mobileParityTitleRule = defineRule({
  id: "mobile-parity-title",
  name: "Mobile Title & Description Parity",
  description: "Checks that the title and meta description match between mobile and desktop",
  category: "mobile",
  weight: 8,
  run: (context) => {
    const inputs = parityInputs("mobile-parity-title", context);
    if (!inputs.available) return inputs.result;
    const desktopTitle = firstText(inputs.desktop, DOCUMENT_TITLE);
    const mobileTitle = firstText(inputs.mobile, DOCUMENT_TITLE);
    const desktopDesc = firstAttr(inputs.desktop, 'meta[name="description"]', "content");
    const mobileDesc = firstAttr(inputs.mobile, 'meta[name="description"]', "content");
    const titleMatches = desktopTitle === mobileTitle;
    const descMatches = desktopDesc === mobileDesc;
    const details = {
      titleMatches,
      descMatches,
      desktopTitle,
      mobileTitle,
      desktopDescription: desktopDesc,
      mobileDescription: mobileDesc
    };
    if (!titleMatches) {
      return fail(
        "mobile-parity-title",
        `Title differs between mobile and desktop - mobile: "${mobileTitle}" vs desktop: "${desktopTitle}"`,
        details
      );
    }
    if (!descMatches) {
      return warn(
        "mobile-parity-title",
        "Meta description differs between mobile and desktop renders",
        details
      );
    }
    return pass("mobile-parity-title", "Title and description match on mobile and desktop", details);
  }
});
export const mobileParityCanonicalRule = defineRule({
  id: "mobile-parity-canonical",
  name: "Mobile Canonical Parity",
  description: "Checks that the canonical URL matches between mobile and desktop",
  category: "mobile",
  weight: 8,
  run: (context) => {
    const inputs = parityInputs("mobile-parity-canonical", context);
    if (!inputs.available) return inputs.result;
    const desktopCanonical = firstAttr(inputs.desktop, 'link[rel="canonical"]', "href");
    const mobileCanonical = firstAttr(inputs.mobile, 'link[rel="canonical"]', "href");
    const details = { desktopCanonical, mobileCanonical };
    if (desktopCanonical !== mobileCanonical) {
      return fail(
        "mobile-parity-canonical",
        `Canonical differs - mobile: "${mobileCanonical || "(none)"}" vs desktop: "${desktopCanonical || "(none)"}"`,
        {
          ...details,
          impact: "Google uses the mobile canonical. A mismatch can point indexing at the wrong URL or undo a deliberate canonical."
        }
      );
    }
    return pass(
      "mobile-parity-canonical",
      "Canonical URL matches on mobile and desktop",
      details
    );
  }
});
export const mobileParityStructuredDataRule = defineRule({
  id: "mobile-parity-structured-data",
  name: "Mobile Structured Data Parity",
  description: "Checks that JSON-LD structured data is present on mobile as well as desktop",
  category: "mobile",
  weight: 8,
  run: (context) => {
    const inputs = parityInputs("mobile-parity-structured-data", context);
    if (!inputs.available) return inputs.result;
    const desktopBlocks = inputs.desktop('script[type="application/ld+json"]').length;
    const mobileBlocks = inputs.mobile('script[type="application/ld+json"]').length;
    const details = { desktopBlocks, mobileBlocks };
    if (desktopBlocks > 0 && mobileBlocks < desktopBlocks) {
      return fail(
        "mobile-parity-structured-data",
        `Mobile has ${mobileBlocks} JSON-LD block(s) vs ${desktopBlocks} on desktop - rich results are built from the mobile page`,
        {
          ...details,
          impact: "Structured data missing from the mobile render will not produce rich results, regardless of what desktop carries."
        }
      );
    }
    if (desktopBlocks === 0 && mobileBlocks === 0) {
      return pass("mobile-parity-structured-data", "No structured data on either render", details);
    }
    return pass(
      "mobile-parity-structured-data",
      `Structured data present on mobile (${mobileBlocks} block(s)) matches desktop`,
      details
    );
  }
});
export const mobileParityLinksRule = defineRule({
  id: "mobile-parity-links",
  name: "Mobile Internal Link Parity",
  description: "Checks that mobile exposes a comparable number of internal links to desktop",
  category: "mobile",
  weight: 6,
  run: (context) => {
    const inputs = parityInputs("mobile-parity-links", context);
    if (!inputs.available) return inputs.result;
    const count = ($: CheerioAPI) => $("a[href]").filter((_, el) => {
      const href = $(el).attr("href") ?? "";
      return href.length > 0 && !href.startsWith("#") && !href.startsWith("javascript:");
    }).length;
    const desktopLinks = count(inputs.desktop);
    const mobileLinks = count(inputs.mobile);
    const ratio = desktopLinks > 0 ? mobileLinks / desktopLinks : 1;
    const details = {
      desktopLinks,
      mobileLinks,
      ratio: Number(ratio.toFixed(2)),
      missingLinks: Math.max(0, desktopLinks - mobileLinks)
    };
    if (desktopLinks < 10) {
      return pass("mobile-parity-links", "Too few links to assess parity", details);
    }
    if (ratio < 0.5) {
      return warn(
        "mobile-parity-links",
        `Mobile exposes ${mobileLinks} links vs ${desktopLinks} on desktop (${Math.round(ratio * 100)}%)`,
        {
          ...details,
          recommendation: "Ensure navigation and in-content links render on mobile - hiding them behind a collapsed menu is fine, but they must be in the DOM."
        }
      );
    }
    return pass(
      "mobile-parity-links",
      `Mobile and desktop expose a comparable number of links (${mobileLinks} vs ${desktopLinks})`,
      details
    );
  }
});

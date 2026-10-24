import { bodyText } from "@/audit/rules/content/utils/visible-text";
import { defineRule } from "@/audit/engine/define-rule";

export const AFFILIATE_PATTERNS = {
  // Common affiliate URL parameters
  urlParams: [
    /[?&](ref|affiliate|aff|partner|tracking|tag|aid|pid|clickid)=/i,
    /[?&]utm_source=(affiliate|partner)/i
  ],
  // Known affiliate networks
  networks: [
    /amazon\.\w+\/.*[?&]tag=/i,
    /shareasale\.com/i,
    /commission[-_]?junction|cj\.com/i,
    /rakuten(marketing|advertising)?/i,
    /awin\d*\.com/i,
    /impact\.com/i,
    /partnerize\.com/i,
    /flexoffers\.com/i,
    /clickbank\.(com|net)/i,
    /avantlink\.com/i,
    /pepperjam\.com/i,
    /linksynergy/i,
    /viglink|sovrn/i,
    /skimlinks/i
  ],
  // Common affiliate link classes/attributes
  selectors: [
    'a[rel*="sponsored"]',
    'a[rel*="nofollow"][href*="amazon"]',
    'a[class*="affiliate"]',
    'a[class*="partner-link"]',
    "a[data-affiliate]",
    "a[data-tracking]"
  ]
};
export const DISCLOSURE_PATTERNS = {
  explicit: [
    /affiliate\s*(link|disclosure|commission)/i,
    /we\s*(may\s+)?(earn|receive)\s*(a\s+)?commission/i,
    /paid\s*(partnership|promotion|sponsorship)/i,
    /sponsored\s*(content|post|by)/i,
    /this\s+(post|article|page)\s+(contains?|includes?)\s+affiliate/i,
    /commission\s+at\s+no\s+(extra|additional)\s+cost/i,
    /partner\s+(links?|program)/i,
    /advertising\s*disclosure/i,
    /material\s+connection/i,
    /compensated\s+for\s+(clicks?|purchases?|referrals?)/i
  ],
  ftcCompliant: [
    /ftc\s*(guidelines?|disclosure|complian)/i,
    /federal\s*trade\s*commission/i,
    /16\s*cfr\s*255/i
    // FTC regulation
  ]
};
export const DISCLOSURE_LOCATIONS = [
  ".disclosure",
  ".affiliate-disclosure",
  ".sponsored-disclosure",
  ".ftc-disclosure",
  '[class*="disclosure"]',
  '[id*="disclosure"]',
  ".notice",
  ".disclaimer",
  "aside"
];
export const affiliateDisclosureRule = defineRule({
  id: "eeat-affiliate-disclosure",
  name: "Affiliate Disclosure",
  description: "Checks for affiliate and sponsored content disclosures",
  category: "eeat",
  weight: 5,
  run(context) {
    const { $ } = context;
    const affiliateLinks: { href: string; type: string; }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      for (const pattern of AFFILIATE_PATTERNS.urlParams) {
        if (pattern.test(href)) {
          affiliateLinks.push({ href: href.slice(0, 80), type: "url-param" });
          return;
        }
      }
      for (const pattern of AFFILIATE_PATTERNS.networks) {
        if (pattern.test(href)) {
          affiliateLinks.push({ href: href.slice(0, 80), type: "network" });
          return;
        }
      }
    });
    for (const selector of AFFILIATE_PATTERNS.selectors) {
      $(selector).each((_, el) => {
        const href = $(el).attr("href") || "";
        if (!affiliateLinks.find((l) => l.href === href.slice(0, 80))) {
          affiliateLinks.push({ href: href.slice(0, 80), type: "selector" });
        }
      });
    }
    $('a[rel*="sponsored"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!affiliateLinks.find((l) => l.href === href.slice(0, 80))) {
        affiliateLinks.push({ href: href.slice(0, 80), type: "sponsored-rel" });
      }
    });
    const bodyText2 = bodyText($);
    const foundDisclosures = [];
    for (const selector of DISCLOSURE_LOCATIONS) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        for (const pattern of DISCLOSURE_PATTERNS.explicit) {
          const match = text.match(pattern);
          if (match) {
            foundDisclosures.push({
              location: selector,
              text: match[0].slice(0, 80)
            });
            return;
          }
        }
      });
    }
    if (foundDisclosures.length === 0) {
      for (const pattern of DISCLOSURE_PATTERNS.explicit) {
        const match = bodyText2.match(pattern);
        if (match) {
          foundDisclosures.push({
            location: "body",
            text: match[0].slice(0, 80)
          });
          break;
        }
      }
    }
    let hasFtcMention = false;
    for (const pattern of DISCLOSURE_PATTERNS.ftcCompliant) {
      if (pattern.test(bodyText2)) {
        hasFtcMention = true;
        break;
      }
    }
    const hasDisclosurePage = $('a[href*="disclosure"], a[href*="affiliate"], a[href*="sponsored"]').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes("disclosure") || text.includes("affiliate");
    }).length > 0;
    const hasAffiliateContent = affiliateLinks.length > 0;
    const hasDisclosure = foundDisclosures.length > 0 || hasDisclosurePage;
    if (!hasAffiliateContent) {
      if (hasDisclosure) {
        return {
          ruleId: "eeat-affiliate-disclosure",
          status: "pass",
          score: 100,
          message: "Disclosure found (no affiliate links detected on this page)",
          details: {
            hasAffiliateLinks: false,
            hasDisclosure: true,
            disclosures: foundDisclosures.slice(0, 3)
          }
        };
      }
      return {
        ruleId: "eeat-affiliate-disclosure",
        status: "pass",
        score: 100,
        message: "No affiliate or sponsored content detected",
        details: {
          hasAffiliateLinks: false,
          hasDisclosure: false
        }
      };
    }
    if (hasDisclosure) {
      const isProminentDisclosure = foundDisclosures.some(
        (d) => d.location !== "body" && d.location !== "aside"
      );
      return {
        ruleId: "eeat-affiliate-disclosure",
        status: "pass",
        score: 100,
        message: `Affiliate disclosure found${hasFtcMention ? " (FTC compliant language)" : ""}`,
        details: {
          hasAffiliateLinks: true,
          affiliateLinkCount: affiliateLinks.length,
          hasDisclosure: true,
          hasFtcMention,
          hasDisclosurePage,
          isProminentDisclosure,
          disclosures: foundDisclosures.slice(0, 3),
          affiliateLinks: affiliateLinks.slice(0, 5),
          ...!isProminentDisclosure && {
            recommendation: "Consider making disclosure more prominent (near top of content)"
          }
        }
      };
    }
    return {
      ruleId: "eeat-affiliate-disclosure",
      status: "warn",
      score: 50,
      message: `${affiliateLinks.length} affiliate link${affiliateLinks.length > 1 ? "s" : ""} found without disclosure - FTC requires clear disclosure`,
      details: {
        hasAffiliateLinks: true,
        affiliateLinkCount: affiliateLinks.length,
        hasDisclosure: false,
        affiliateLinks: affiliateLinks.slice(0, 5),
        recommendation: 'Add a clear affiliate disclosure near the top of content. Example: "This post contains affiliate links. We may earn a commission at no extra cost to you."'
      }
    };
  }
});

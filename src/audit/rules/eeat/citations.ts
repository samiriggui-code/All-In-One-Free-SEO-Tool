import { defineRule } from "@/audit/engine/define-rule";

export const AUTHORITATIVE_DOMAINS = {
  government: [
    /\.gov$/i,
    /\.gov\.[a-z]{2}$/i,
    // e.g., .gov.uk
    /\.mil$/i
  ],
  education: [
    /\.edu$/i,
    /\.edu\.[a-z]{2}$/i,
    /\.ac\.[a-z]{2}$/i
    // e.g., .ac.uk
  ],
  organizations: [
    /\.org$/i,
    /who\.int$/i,
    /cdc\.gov$/i,
    /nih\.gov$/i,
    /fda\.gov$/i,
    /mayoclinic\.org$/i,
    /webmd\.com$/i,
    /healthline\.com$/i
  ],
  research: [
    /pubmed/i,
    /ncbi\.nlm\.nih\.gov/i,
    /scholar\.google/i,
    /jstor\.org/i,
    /sciencedirect\.com/i,
    /nature\.com/i,
    /springer\.com/i,
    /wiley\.com/i,
    /researchgate\.net/i,
    /arxiv\.org/i,
    /doi\.org/i
  ],
  news: [
    /reuters\.com$/i,
    /apnews\.com$/i,
    /bbc\.(com|co\.uk)$/i,
    /nytimes\.com$/i,
    /washingtonpost\.com$/i,
    /theguardian\.com$/i,
    /wsj\.com$/i,
    /economist\.com$/i
  ]
};
export const CITATION_SELECTORS = [
  ".citation",
  ".reference",
  ".footnote",
  ".endnote",
  '[class*="cite"]',
  '[class*="source"]',
  '[class*="reference"]',
  'sup a[href^="#"]',
  // Footnote-style
  ".bibliography",
  ".works-cited"
];
export const CHROME = 'nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]';
export function siteOf(hostname: string) {
  const labels = hostname.toLowerCase().split(".");
  const countrySecondLevel = labels.length > 2 && labels[labels.length - 1].length === 2 && /^(co|com|ac|gov|org|net|edu)$/.test(labels[labels.length - 2]);
  return labels.slice(countrySecondLevel ? -3 : -2).join(".");
}
export const citationsRule = defineRule({
  id: "eeat-citations",
  name: "Citations",
  description: "Checks for citations to authoritative external sources",
  category: "eeat",
  weight: 6,
  run(context) {
    const { $, url } = context;
    const currentDomain = new URL(url).hostname;
    const currentSite = siteOf(currentDomain);
    const citations: { href: string; domain: string; type: string; hasNofollow: boolean; }[] = [];
    $('a[href^="http"]').each((_, el) => {
      if ($(el).closest(CHROME).length > 0) return;
      const href = $(el).attr("href") || "";
      const rel = $(el).attr("rel") || "";
      try {
        const linkUrl = new URL(href);
        const domain = linkUrl.hostname;
        if (siteOf(domain) === currentSite) {
          return;
        }
        for (const [type, patterns] of Object.entries(AUTHORITATIVE_DOMAINS)) {
          for (const pattern of patterns) {
            if (pattern.test(domain)) {
              citations.push({
                href: href.slice(0, 100),
                domain,
                type,
                hasNofollow: rel.includes("nofollow")
              });
              return;
            }
          }
        }
      } catch {
      }
    });
    let hasCitationMarkup = false;
    for (const selector of CITATION_SELECTORS) {
      if ($(selector).length > 0) {
        hasCitationMarkup = true;
        break;
      }
    }
    const hasReferencesSection = $("h2, h3, h4").filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return /references|sources|bibliography|works cited|further reading/i.test(text);
    }).length > 0;
    const citationsByType: Record<string, number> = {};
    for (const citation of citations) {
      citationsByType[citation.type] = (citationsByType[citation.type] || 0) + 1;
    }
    const nofollowedCitations = citations.filter((c) => c.hasNofollow);
    if (citations.length >= 3) {
      return {
        ruleId: "eeat-citations",
        status: "pass",
        score: 100,
        message: `Strong citation profile: ${citations.length} authoritative sources cited`,
        details: {
          citationCount: citations.length,
          citationsByType,
          hasCitationMarkup,
          hasReferencesSection,
          nofollowedCount: nofollowedCitations.length,
          citations: citations.slice(0, 5),
          ...nofollowedCitations.length > 0 && {
            recommendation: "Consider removing nofollow from citations to authoritative sources"
          }
        }
      };
    }
    if (citations.length >= 1) {
      return {
        ruleId: "eeat-citations",
        status: "pass",
        score: 100,
        message: `${citations.length} authoritative source${citations.length > 1 ? "s" : ""} cited`,
        details: {
          citationCount: citations.length,
          citationsByType,
          hasCitationMarkup,
          hasReferencesSection,
          citations: citations.slice(0, 5),
          recommendation: "Consider adding more citations to authoritative sources (.gov, .edu, research papers)"
        }
      };
    }
    const externalLinkCount = $('a[href^="http"]').filter((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const linkDomain = new URL(href).hostname;
        return linkDomain !== currentDomain;
      } catch {
        return false;
      }
    }).length;
    if (externalLinkCount > 0) {
      return {
        ruleId: "eeat-citations",
        status: "warn",
        score: 50,
        message: `${externalLinkCount} external links found, but none to recognized authoritative sources`,
        details: {
          citationCount: 0,
          externalLinkCount,
          hasCitationMarkup,
          hasReferencesSection,
          recommendation: "Consider linking to authoritative sources like .gov, .edu, or peer-reviewed publications"
        }
      };
    }
    return {
      ruleId: "eeat-citations",
      status: "pass",
      score: 100,
      message: "No external citations found (may not be needed for this content type)",
      details: {
        citationCount: 0,
        hasCitationMarkup,
        hasReferencesSection,
        recommendation: "For content making claims, consider citing authoritative sources to build credibility"
      }
    };
  }
});

import type { JsonLd } from "@/audit/rules/schema/utils";
import { defineRule, notMeasured } from "@/audit/engine/define-rule";

export const CREDENTIAL_PATTERNS = [
  // Medical/Health
  /\b(M\.?D\.?|D\.?O\.?|Ph\.?D\.?|Pharm\.?D\.?|D\.?N\.?P\.?|R\.?N\.?|N\.?P\.?|P\.?A\.?-C)\b/g,
  /\b(Board[-\s]?Certified|Licensed\s+\w+|Registered\s+\w+)\b/gi,
  // Legal
  /\b(J\.?D\.?|Esq\.?|Attorney|Lawyer|Bar[-\s]?Certified)\b/gi,
  // Financial
  /\b(C\.?P\.?A\.?|C\.?F\.?A\.?|C\.?F\.?P\.?|Series\s+\d+|FINRA)\b/gi,
  // Academic/Technical
  /\b(Professor|Dr\.|Doctorate|Master'?s?|MBA|M\.?S\.?|B\.?S\.?|B\.?A\.?)\b/g,
  // Experience indicators
  /\b(\d+\+?\s*years?\s*(of\s+)?experience)\b/gi,
  /\b(Senior|Lead|Principal|Chief|Director|Head\s+of)\b/gi,
  // Certifications
  /\b(Certified|Accredited|Licensed|Registered)\s+\w+/gi
];
export const SOCIAL_PATTERNS = {
  linkedin: /linkedin\.com\/in\//i,
  twitter: /twitter\.com\/|x\.com\//i,
  github: /github\.com\//i,
  scholar: /scholar\.google\./i,
  orcid: /orcid\.org\//i
};
export const authorExpertiseRule = defineRule({
  id: "eeat-author-expertise",
  name: "Author Expertise",
  description: "Checks for author credentials and expertise indicators",
  category: "eeat",
  weight: 8,
  run(context) {
    const { $ } = context;
    const signals = [];
    const credentials: string[] = [];
    const socialLinks: string[] = [];
    const authorSelectors = [
      ".author",
      ".byline",
      ".post-author",
      ".article-author",
      ".author-bio",
      ".author-info",
      ".author-box",
      '[class*="author"]',
      '[itemprop="author"]',
      '[rel="author"]'
    ];
    let authorText = "";
    let authorBio = "";
    let hasAuthorLink = false;
    for (const selector of authorSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 10) {
          authorText = text;
          if (text.length > 100) {
            authorBio = text;
            signals.push(`Author bio found (${text.length} chars)`);
          }
          const authorLink = element.find('a[href*="author"], a[href*="team"], a[href*="about"]').first();
          if (authorLink.length > 0) {
            hasAuthorLink = true;
            signals.push("Author page link found");
          }
          break;
        }
      }
    }
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
          const data = JSON.parse(content);
          const checkAuthorSchema = (obj: JsonLd) => {
            if (!obj || typeof obj !== "object") return;
            const record = obj;
            if (record.author && typeof record.author === "object") {
              const author = record.author;
              if (author.description && typeof author.description === "string") {
                if (author.description.length > 50) {
                  signals.push("Schema.org author description found");
                  authorBio = authorBio || author.description;
                }
              }
              if (author.jobTitle) {
                signals.push(`Schema.org jobTitle: ${author.jobTitle}`);
              }
              if (Array.isArray(author.sameAs)) {
                for (const link of author.sameAs) {
                  if (typeof link === "string") {
                    for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
                      if (pattern.test(link)) {
                        socialLinks.push(platform);
                      }
                    }
                  }
                }
              }
              if (author.url) {
                hasAuthorLink = true;
              }
            }
            if (Array.isArray(record["@graph"])) {
              for (const item of record["@graph"]) {
                checkAuthorSchema(item);
              }
            }
          };
          checkAuthorSchema(data);
        }
      } catch {
      }
    });
    const textToCheck = authorText || authorBio || "";
    for (const pattern of CREDENTIAL_PATTERNS) {
      const matches = textToCheck.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (!credentials.includes(match)) {
            credentials.push(match);
          }
        }
      }
    }
    if (credentials.length > 0) {
      signals.push(`Credentials found: ${credentials.slice(0, 3).join(", ")}${credentials.length > 3 ? "..." : ""}`);
    }
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const isAuthorRelated = $(el).closest('[class*="author"], [class*="bio"], .byline').length > 0;
      if (isAuthorRelated) {
        for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
          if (pattern.test(href) && !socialLinks.includes(platform)) {
            socialLinks.push(platform);
          }
        }
      }
    });
    if (socialLinks.length > 0) {
      signals.push(`Social profiles: ${socialLinks.join(", ")}`);
    }
    const hasExpertise = credentials.length > 0 || authorBio.length > 100 || socialLinks.length >= 2;
    if (signals.length >= 3 || hasExpertise && signals.length >= 2) {
      return {
        ruleId: "eeat-author-expertise",
        status: "pass",
        score: 100,
        message: `Strong author expertise signals found (${signals.length} indicators)`,
        details: {
          signals,
          credentials,
          socialLinks,
          hasAuthorBio: authorBio.length > 100,
          hasAuthorLink
        }
      };
    }
    if (signals.length > 0) {
      return {
        ruleId: "eeat-author-expertise",
        status: "pass",
        score: 100,
        message: `Author expertise signals found (${signals.length} indicator${signals.length > 1 ? "s" : ""})`,
        details: {
          signals,
          credentials,
          socialLinks,
          hasAuthorBio: authorBio.length > 100,
          hasAuthorLink,
          recommendation: "Consider adding more expertise indicators: credentials, detailed bio, social profiles"
        }
      };
    }
    const hasAnyAuthor = $(authorSelectors.join(", ")).length > 0 || $('meta[name="author"]').length > 0;
    if (hasAnyAuthor) {
      return {
        ruleId: "eeat-author-expertise",
        status: "warn",
        score: 50,
        message: "Author found but no expertise indicators detected",
        details: {
          signals: [],
          credentials: [],
          socialLinks: [],
          recommendation: "Add author credentials, bio, and professional social links to establish expertise"
        }
      };
    }
    return notMeasured("eeat-author-expertise", "No author present - expertise check not applicable", {
      signals: [],
      note: "This check requires author attribution. See eeat-author-byline rule."
    });
  }
});

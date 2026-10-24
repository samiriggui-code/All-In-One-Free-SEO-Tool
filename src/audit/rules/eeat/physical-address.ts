import type { JsonLd } from "@/audit/rules/schema/utils";
import { defineRule } from "@/audit/engine/define-rule";

export const ADDRESS_PATTERNS = {
  // US-style: 123 Main St, City, ST 12345
  us: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl)[\s,]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}(-\d{4})?/gi,
  // UK-style: 123 High Street, London, SW1A 1AA
  uk: /\d+\s+[\w\s]+,?\s*[\w\s]+,?\s*[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/gi,
  // Generic: number + street name + city/region pattern
  generic: /\d+[-\s]?\d*\s+[\w\s]{3,30}(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|plaza|square|park)[\s,]+[\w\s]+/gi,
  // PO Box
  poBox: /p\.?o\.?\s*box\s*\d+/gi
};
export const SCHEMA_ADDRESS_TYPES = [
  "PostalAddress",
  "Place",
  "LocalBusiness",
  "Organization"
];
export const ADDRESS_SELECTORS = [
  "address",
  '[itemtype*="PostalAddress"]',
  '[itemprop="address"]',
  '[class*="address"]',
  '[class*="location"]',
  ".contact-info",
  ".company-info",
  ".footer-address"
];
export const physicalAddressRule = defineRule({
  id: "eeat-physical-address",
  name: "Physical Address",
  description: "Checks for visible physical address information",
  category: "eeat",
  weight: 6,
  run(context) {
    const { $ } = context;
    const foundAddresses = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
          const data = JSON.parse(content);
          const checkAddress = (obj: JsonLd) => {
            if (!obj || typeof obj !== "object") return;
            const record = obj;
            const type = record["@type"];
            if (typeof type === "string" && SCHEMA_ADDRESS_TYPES.some((t) => type.includes(t))) {
              if (record.address) {
                const addr = record.address;
                const parts = [
                  addr.streetAddress,
                  addr.addressLocality,
                  addr.addressRegion,
                  addr.postalCode,
                  addr.addressCountry
                ].filter(Boolean);
                if (parts.length >= 2) {
                  foundAddresses.push({
                    source: "Schema.org",
                    value: parts.join(", ").slice(0, 100)
                  });
                }
              }
            }
            if (Array.isArray(record["@graph"])) {
              for (const item of record["@graph"]) {
                checkAddress(item);
              }
            }
          };
          checkAddress(data);
        }
      } catch {
      }
    });
    for (const selector of ADDRESS_SELECTORS) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 10 && text.length < 200) {
          for (const pattern of Object.values(ADDRESS_PATTERNS)) {
            const match = text.match(pattern);
            if (match) {
              foundAddresses.push({
                source: `HTML (${selector})`,
                value: match[0].slice(0, 100)
              });
              return;
            }
          }
        }
      });
    }
    const footerText = $('footer, [role="contentinfo"], .footer').text();
    if (footerText && foundAddresses.length === 0) {
      for (const pattern of Object.values(ADDRESS_PATTERNS)) {
        const match = footerText.match(pattern);
        if (match) {
          foundAddresses.push({
            source: "Footer",
            value: match[0].slice(0, 100)
          });
          break;
        }
      }
    }
    const hasGoogleMaps = $('iframe[src*="google.com/maps"], iframe[src*="maps.google"]').length > 0;
    if (hasGoogleMaps) {
      foundAddresses.push({
        source: "Google Maps embed",
        value: "Map embedded on page"
      });
    }
    const microdataAddress = $('[itemprop="streetAddress"]').text().trim();
    const microdataCity = $('[itemprop="addressLocality"]').text().trim();
    if (microdataAddress && microdataCity) {
      foundAddresses.push({
        source: "Microdata",
        value: `${microdataAddress}, ${microdataCity}`.slice(0, 100)
      });
    }
    const isBusinessSite = $(
      '[class*="cart"], [class*="shop"], [class*="store"], [class*="product"], form[action*="checkout"], [class*="booking"], [class*="appointment"]'
    ).length > 0;
    const isLocalBusiness = $('script[type="application/ld+json"]').filter((_, el) => {
      const content = $(el).html() || "";
      return /LocalBusiness|Store|Restaurant|Hotel|MedicalBusiness/i.test(content);
    }).length > 0;
    const uniqueAddresses = foundAddresses.filter(
      (addr, index, arr) => arr.findIndex((a) => a.value === addr.value) === index
    );
    if (uniqueAddresses.length > 0) {
      const hasSchemaAddress = uniqueAddresses.some((a) => a.source === "Schema.org");
      return {
        ruleId: "eeat-physical-address",
        status: "pass",
        score: 100,
        message: `Physical address found${hasSchemaAddress ? " with structured data" : ""}`,
        details: {
          hasAddress: true,
          hasSchemaMarkup: hasSchemaAddress,
          hasGoogleMaps,
          addresses: uniqueAddresses.slice(0, 3)
        }
      };
    }
    if (isLocalBusiness || isBusinessSite) {
      return {
        ruleId: "eeat-physical-address",
        status: "warn",
        score: 50,
        message: "No physical address found - important for business trust signals",
        details: {
          hasAddress: false,
          isBusinessSite: true,
          recommendation: "Add your business address using Schema.org PostalAddress and display it visibly on the page"
        }
      };
    }
    return {
      ruleId: "eeat-physical-address",
      status: "pass",
      score: 100,
      message: "No physical address found (may not be required for this site type)",
      details: {
        hasAddress: false,
        isBusinessSite: false,
        recommendation: "Consider adding a physical address if you operate a business to build trust"
      }
    };
  }
});

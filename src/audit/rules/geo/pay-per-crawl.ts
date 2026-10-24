import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function readHeader(headers: Record<string, string>, name: string) {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target && value.trim()) return value.trim();
  }
  return "";
}
export function hasPaymentTerms(headers: Record<string, string>) {
  if (readHeader(headers, "pay")) return true;
  if (readHeader(headers, "crawler-price")) return true;
  if (readHeader(headers, "x-crawler-price")) return true;
  return /payment/i.test(readHeader(headers, "link"));
}
export const payPerCrawlRule = defineRule({
  id: "geo-pay-per-crawl",
  name: "Pay-Per-Crawl Response",
  description: "Checks that an HTTP 402 response includes payment terms",
  category: "geo",
  weight: 3,
  run: (context) => {
    const terms = hasPaymentTerms(context.headers);
    if (context.statusCode !== 402) {
      return pass("geo-pay-per-crawl", "The response is not a pay-per-crawl challenge", {
        statusCode: context.statusCode,
        terms
      });
    }
    if (terms) {
      return pass("geo-pay-per-crawl", "HTTP 402 includes payment terms", {
        statusCode: 402,
        terms: true
      });
    }
    return warn("geo-pay-per-crawl", "HTTP 402 does not say how a crawler can pay", {
      statusCode: 402,
      terms: false,
      recommendation: "Add a Pay or Crawler-Price header, or a Link with rel=payment, to the 402 response."
    });
  }
});

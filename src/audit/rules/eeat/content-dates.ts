import type { JsonLd } from "@/audit/rules/schema/utils";
import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const contentDatesRule = defineRule({
  id: "eeat-content-dates",
  name: "Content Dates",
  description: "Checks for published and modified dates on content",
  category: "eeat",
  weight: 8,
  run: async (context) => {
    const { $, headers } = context;
    const signals = [];
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
          const data = JSON.parse(content);
          const checkDates = (obj: JsonLd) => {
            if (!obj || typeof obj !== "object") return;
            const record = obj;
            if (record.datePublished && typeof record.datePublished === "string") {
              signals.push({ type: "Schema.org datePublished", value: record.datePublished });
            }
            if (record.dateModified && typeof record.dateModified === "string") {
              signals.push({ type: "Schema.org dateModified", value: record.dateModified });
            }
            if (Array.isArray(record["@graph"])) {
              for (const item of record["@graph"]) {
                checkDates(item);
              }
            }
          };
          checkDates(data);
        }
      } catch {
      }
    });
    const timeElements = $("time[datetime]");
    timeElements.each((_, el) => {
      const datetime = $(el).attr("datetime");
      if (datetime) {
        signals.push({ type: "HTML time element", value: datetime });
      }
    });
    const ogPublished = $('meta[property="article:published_time"]').attr("content");
    if (ogPublished) {
      signals.push({ type: "article:published_time", value: ogPublished });
    }
    const ogModified = $('meta[property="article:modified_time"]').attr("content");
    if (ogModified) {
      signals.push({ type: "article:modified_time", value: ogModified });
    }
    const lastModified = headers["last-modified"] || headers["Last-Modified"];
    if (lastModified) {
      signals.push({ type: "Last-Modified header", value: lastModified });
    }
    const dateClasses = [".published", ".date", ".post-date", ".entry-date", '[class*="date"]'];
    for (const selector of dateClasses) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && text.length < 50 && /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|\w+\s+\d{1,2},?\s+\d{4}/i.test(text)) {
          signals.push({ type: `Visible date (${selector})`, value: text });
          break;
        }
      }
    }
    if (signals.length > 0) {
      const uniqueSignals = signals.filter(
        (signal, index, arr) => arr.findIndex((s) => s.type === signal.type) === index
      );
      return pass(
        "eeat-content-dates",
        `Content date signals found (${uniqueSignals.length} type${uniqueSignals.length > 1 ? "s" : ""})`,
        {
          signals: uniqueSignals,
          recommendation: "Update dateModified when making significant content changes"
        }
      );
    }
    return warn("eeat-content-dates", "No content date signals found", {
      signals: [],
      recommendation: "Add datePublished and dateModified to Article schema, or use <time> elements with datetime attributes",
      impact: "Search engines use date signals to assess content freshness, which can affect rankings for time-sensitive queries"
    });
  }
});

import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const ACTIVE_TYPES = ["script", "stylesheet", "iframe", "object", "embed"];
export const mixedContentRule = defineRule({
  id: "security-mixed-content",
  name: "Mixed Content",
  description: "Checks for HTTP resources on HTTPS pages",
  category: "security",
  weight: 8,
  run: (context) => {
    const { $, url } = context;
    if (!url.startsWith("https://")) {
      return pass("security-mixed-content", "Page is not HTTPS, mixed content check not applicable", {
        isHttps: false
      });
    }
    const mixedContent: { type: string; url: string; }[] = [];
    $('script[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "script", url: src });
    });
    $('link[rel="stylesheet"][href^="http://"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) mixedContent.push({ type: "stylesheet", url: href });
    });
    $('img[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "image", url: src });
    });
    $('iframe[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "iframe", url: src });
    });
    $('audio[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "audio", url: src });
    });
    $('audio source[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "audio", url: src });
    });
    $('video[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "video", url: src });
    });
    $('video source[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "video", url: src });
    });
    $('object[data^="http://"]').each((_, el) => {
      const data = $(el).attr("data");
      if (data) mixedContent.push({ type: "object", url: data });
    });
    $('embed[src^="http://"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) mixedContent.push({ type: "embed", url: src });
    });
    if (mixedContent.length === 0) {
      return pass("security-mixed-content", "No mixed content detected", { isHttps: true });
    }
    const hasActiveMixed = mixedContent.some((item) => ACTIVE_TYPES.includes(item.type));
    const byType = mixedContent.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const message = `Found ${mixedContent.length} HTTP resource(s) on HTTPS page`;
    const details = {
      mixedContent: mixedContent.slice(0, 20),
      totalMixed: mixedContent.length,
      byType,
      hasActiveMixed
    };
    return hasActiveMixed ? fail("security-mixed-content", message, details) : warn("security-mixed-content", message, details);
  }
});

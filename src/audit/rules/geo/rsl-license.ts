import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";
import { looksLikeHtml, probeOnce } from "@/audit/rules/geo/probe";

export function licenseUrls(robots: string, pageUrl: string) {
  const urls = [];
  for (const raw of robots.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = /^license:\s*(\S+)/i.exec(line);
    if (!match) continue;
    try {
      urls.push(new URL(match[1], pageUrl).href);
    } catch {
      urls.push(match[1]);
    }
  }
  return urls;
}
export function looksLikeLicense(body: string) {
  return /rsl|license|permits|prohibitions|usage/i.test(body);
}
export const rslLicenseRule = defineRule({
  id: "geo-rsl-license",
  name: "Robots License Target",
  description: "Checks that a robots.txt License URL resolves to a license document",
  category: "geo",
  weight: 4,
  run: async (context) => {
    if (context.robotsTxtContent === void 0) {
      return notMeasured(
        "geo-rsl-license",
        "robots.txt was not fetched, so a License directive cannot be checked"
      );
    }
    const urls = licenseUrls(context.robotsTxtContent, context.url);
    if (urls.length === 0) {
      return pass("geo-rsl-license", "robots.txt has no License directive", { urls: [] });
    }
    const broken = [];
    for (const url of urls) {
      const result = await probeOnce(url, {}, context.signal);
      if (!result || result.status !== 200 || looksLikeHtml(result) || !looksLikeLicense(result.body)) {
        broken.push(url);
      }
    }
    if (broken.length === 0) {
      return pass("geo-rsl-license", "License target resolves", { urls });
    }
    return warn("geo-rsl-license", `License target did not resolve as a license document: ${broken.join(", ")}`, {
      urls,
      broken,
      recommendation: "Point License: at a document that returns 200 and describes the license, not an HTML page."
    });
  }
});

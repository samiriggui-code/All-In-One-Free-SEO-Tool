import { RobotsMatcher } from "@/audit/crawler/robots";
import { defineRule, fail, notMeasured, pass } from "@/audit/engine/define-rule";
import { getUserAgent } from "@/audit/crawler/user-agent";

export const MAX_LISTED = 10;
export const blockedImagesRule = defineRule({
  id: "crawl-blocked-images",
  name: "Blocked Images",
  description: "Flags image URLs that are disallowed by robots.txt",
  category: "crawl",
  weight: 7,
  run: (context) => {
    if (!context.robotsTxtContent) {
      return notMeasured(
        "crawl-blocked-images",
        "robots.txt was not fetched, so disallow status of image URLs is unknown"
      );
    }
    const matcher = new RobotsMatcher(context.robotsTxtContent, getUserAgent());
    let pageOrigin2;
    try {
      pageOrigin2 = new URL(context.url).origin;
    } catch {
      return notMeasured(
        "crawl-blocked-images",
        "Page URL could not be parsed, so image URLs cannot be resolved against it"
      );
    }
    let imageCount = 0;
    const blockedImages = [];
    for (const image of context.images) {
      if (!image.src) continue;
      let absolute2;
      try {
        const resolved = new URL(image.src, context.url);
        if (resolved.origin !== pageOrigin2) continue;
        absolute2 = resolved.href;
      } catch {
        continue;
      }
      imageCount++;
      if (!matcher.isAllowed(absolute2)) {
        blockedImages.push(absolute2);
      }
    }
    const details = {
      imageCount,
      blockedCount: blockedImages.length,
      blockedImages: blockedImages.slice(0, MAX_LISTED)
    };
    if (blockedImages.length > 0) {
      return fail(
        "crawl-blocked-images",
        `${blockedImages.length} image URL(s) are disallowed by robots.txt`,
        {
          ...details,
          impact: "Disallowed images cannot be crawled, so search engines cannot index them for image search.",
          recommendation: "Allow the image paths in robots.txt, or serve the images from a path that is not disallowed."
        }
      );
    }
    return pass(
      "crawl-blocked-images",
      `No images are disallowed by robots.txt (${imageCount} checked)`,
      details
    );
  }
});

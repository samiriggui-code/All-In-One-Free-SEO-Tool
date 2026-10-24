import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MAX_URLS_IN_DETAILS = 5;
export const videoForAnimationsRule = defineRule({
  id: "perf-video-for-animations",
  name: "Video for Animations",
  description: "Checks if page uses GIF images that should be replaced with video or WebP",
  category: "perf",
  weight: 4,
  run: (context) => {
    const { $, images } = context;
    const gifUrls: string[] = [];
    for (const image of images) {
      if (image.src && /\.gif(\?|$)/i.test(image.src)) {
        gifUrls.push(image.src);
      }
    }
    $('source[type="image/gif"]').each((_, el) => {
      const srcset = $(el).attr("srcset") || $(el).attr("src") || "";
      if (srcset && !gifUrls.includes(srcset)) {
        gifUrls.push(srcset);
      }
    });
    $('[style*=".gif"]').each((_, el) => {
      const style = $(el).attr("style") || "";
      const matches = style.match(/url\s*\(\s*['"]?([^'")]+\.gif[^'")]*)/gi) || [];
      for (const match of matches) {
        const urlMatch = match.match(/url\s*\(\s*['"]?([^'")\s]+)/i);
        if (urlMatch && urlMatch[1] && !gifUrls.includes(urlMatch[1])) {
          gifUrls.push(urlMatch[1]);
        }
      }
    });
    const gifCount = gifUrls.length;
    const details = {
      gifCount,
      gifUrls: gifUrls.slice(0, MAX_URLS_IN_DETAILS)
    };
    if (gifCount > 0) {
      const truncatedNote = gifCount > MAX_URLS_IN_DETAILS ? ` (showing first ${MAX_URLS_IN_DETAILS})` : "";
      return warn(
        "perf-video-for-animations",
        `Found ${gifCount} GIF image(s)${truncatedNote} \u2014 consider using <video> (MP4/WebM) or animated WebP/AVIF for much smaller file sizes`,
        details
      );
    }
    return pass(
      "perf-video-for-animations",
      "No GIF images found \u2014 page uses appropriate media formats",
      details
    );
  }
});

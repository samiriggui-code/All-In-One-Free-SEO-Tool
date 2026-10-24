import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const MAX_RECOMMENDED_SIZE_BYTES = 200 * 1024;
export const LARGE_IMAGE_INDICATORS = [
  "hero",
  "banner",
  "background",
  "full-width",
  "fullwidth",
  "cover",
  "large",
  "big",
  "hd",
  "4k",
  "2x",
  "3x",
  "retina"
];
export function estimatePotentiallyOversized(src: string, width: string | undefined, height: string | undefined) {
  const srcLower = src.toLowerCase();
  for (const indicator of LARGE_IMAGE_INDICATORS) {
    if (srcLower.includes(indicator)) {
      return {
        isLikelyLarge: true,
        reason: `Filename suggests large image (contains "${indicator}")`
      };
    }
  }
  if (width && height) {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (!isNaN(w) && !isNaN(h)) {
      if (w >= 2e3 || h >= 2e3) {
        return {
          isLikelyLarge: true,
          reason: `Large dimensions (${w}x${h}px)`
        };
      }
      const pixels = w * h;
      if (pixels >= 2e6) {
        return {
          isLikelyLarge: true,
          reason: `High pixel count (${(pixels / 1e6).toFixed(1)} megapixels)`
        };
      }
    }
  }
  if (srcLower.includes("original") || srcLower.includes("raw") || srcLower.includes("uncompressed")) {
    return {
      isLikelyLarge: true,
      reason: "Filename suggests unoptimized image"
    };
  }
  return { isLikelyLarge: false, reason: "" };
}
export const sizeRule = defineRule({
  id: "images-size",
  name: "Image File Size",
  description: "Checks that images are not excessively large (warns if estimated >200KB)",
  category: "images",
  weight: 10,
  run: (context) => {
    const { images } = context;
    if (images.length === 0) {
      return pass(
        "images-size",
        "No images found on page",
        { imageCount: 0 }
      );
    }
    const potentiallyOversized = [];
    for (const img of images) {
      const { isLikelyLarge, reason } = estimatePotentiallyOversized(
        img.src,
        img.width,
        img.height
      );
      if (isLikelyLarge) {
        potentiallyOversized.push({
          src: img.src,
          reason,
          width: img.width,
          height: img.height
        });
      }
    }
    if (potentiallyOversized.length > 0) {
      return warn(
        "images-size",
        `Found ${potentiallyOversized.length} potentially oversized image(s) (may exceed 200KB)`,
        {
          potentiallyOversizedCount: potentiallyOversized.length,
          totalImages: images.length,
          maxRecommendedSizeKB: MAX_RECOMMENDED_SIZE_BYTES / 1024,
          images: potentiallyOversized.slice(0, 10),
          suggestion: "Optimize large images using compression, resizing, or modern formats (WebP/AVIF)",
          note: "File sizes are estimated based on image attributes and filenames. Use browser DevTools for actual sizes."
        }
      );
    }
    return pass(
      "images-size",
      `No obviously oversized images detected among ${images.length} image(s)`,
      {
        totalImages: images.length,
        maxRecommendedSizeKB: MAX_RECOMMENDED_SIZE_BYTES / 1024,
        note: "This is a heuristic check. Use browser DevTools to verify actual file sizes."
      }
    );
  }
});

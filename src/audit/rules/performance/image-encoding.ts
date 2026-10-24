import type { AssetInfo } from "@/audit/types";
import { assetContentLength, partitionBySizeKnown, unsizedReason } from "@/audit/rules/performance/asset-size";
import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS12 = {
  /** Transferred images above 100KB are generally considered large */
  oversizedBytes: 100 * 1024,
  /** How many offending image URLs to list in the result message */
  maxListed: 5
};
export const LEGACY_CONTENT_TYPES = /* @__PURE__ */ new Set(["image/bmp", "image/x-ms-bmp", "image/tiff"]);
export const LEGACY_EXTENSION = /\.(bmp|tiff?)$/i;
export function isLegacyFormat(asset: Pick<AssetInfo, "headers" | "url">) {
  const contentType = (asset.headers["content-type"] || "").split(";")[0].trim();
  if (LEGACY_CONTENT_TYPES.has(contentType)) return true;
  return LEGACY_EXTENSION.test(asset.url.split("?")[0]);
}
export const imageEncodingRule = defineRule({
  id: "perf-image-encoding",
  name: "Efficient Image Encoding",
  description: "Checks rendered images for oversized transfers (>100KB) and legacy formats (BMP/TIFF)",
  category: "perf",
  weight: 6,
  run: (context) => {
    const { assets } = context;
    if (!assets) {
      return notMeasured(
        "perf-image-encoding",
        "Could not measure image encoding \u2014 page was not rendered",
        { reason: "Asset data not available" }
      );
    }
    const images = assets.filter(
      (a) => a.resourceType === "image" && a.statusCode >= 200 && a.statusCode < 300
    );
    const legacy = images.filter(isLegacyFormat);
    const { sized: sizedImages, unsized: unsizedImages } = partitionBySizeKnown(images);
    const oversized = sizedImages.filter((a) => (assetContentLength(a) ?? 0) > THRESHOLDS12.oversizedBytes).sort((a, b) => (assetContentLength(b) ?? 0) - (assetContentLength(a) ?? 0));
    const details = {
      imageCount: images.length,
      legacyCount: legacy.length,
      oversizedCount: oversized.length,
      unsizedCount: unsizedImages.length,
      thresholds: THRESHOLDS12
    };
    if (images.length === 0) {
      return pass("perf-image-encoding", "No images observed during render", details);
    }
    const listUrls = (list: AssetInfo[], withSize: boolean) => {
      const listed = list.slice(0, THRESHOLDS12.maxListed).map((a) => withSize ? `${a.url} (${Math.round((assetContentLength(a) ?? 0) / 1024)}KB)` : a.url);
      const suffix = list.length > THRESHOLDS12.maxListed ? `, and ${list.length - THRESHOLDS12.maxListed} more` : "";
      return listed.join(", ") + suffix;
    };
    if (legacy.length > 0) {
      const oversizedNote = oversized.length > 0 ? `; ${oversized.length} image(s) also exceed 100KB: ${listUrls(oversized, true)}` : "";
      return fail(
        "perf-image-encoding",
        `${legacy.length} image(s) use legacy formats (BMP/TIFF) \u2014 replace with WebP or AVIF: ${listUrls(legacy, false)}${oversizedNote}`,
        {
          ...details,
          legacy: legacy.map((a) => a.url),
          oversized: oversized.map((a) => a.url)
        }
      );
    }
    if (oversized.length > 0) {
      return warn(
        "perf-image-encoding",
        `${oversized.length} image(s) transferred over 100KB: ${listUrls(oversized, true)}`,
        { ...details, oversized: oversized.map((a) => a.url) }
      );
    }
    if (unsizedImages.length > 0) {
      return notMeasured(
        "perf-image-encoding",
        `No legacy image formats found, but transfer size could not be confirmed \u2014 ${unsizedReason(unsizedImages.length, "image")}`,
        { ...details, unsized: unsizedImages.map((a) => a.url) }
      );
    }
    return pass(
      "perf-image-encoding",
      `All ${images.length} image(s) are reasonably sized and use efficient formats`,
      details
    );
  }
});

import { assetContentLength, partitionBySizeKnown, unsizedReason } from "@/audit/rules/performance/asset-size";
import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";
import type { AssetInfo } from "@/audit/types";

export const THRESHOLDS5 = {
  /** Text assets below this size gain little from compression */
  minSizeBytes: 2048,
  /** How many offending asset URLs to list in the result message */
  maxListed: 5
};
export function isTextAsset(asset: AssetInfo) {
  if (asset.resourceType === "stylesheet" || asset.resourceType === "script") return true;
  const contentType = asset.headers["content-type"] || "";
  return contentType.startsWith("text/") || /javascript|json|xml|svg/.test(contentType);
}
export function isCompressed(asset: AssetInfo) {
  const encoding = asset.headers["content-encoding"] || "";
  return /gzip|br|deflate|zstd/i.test(encoding);
}
export const assetCompressionRule = defineRule({
  id: "perf-asset-compression",
  name: "Text Asset Compression",
  description: "Checks that text-based assets over 2KB are served with gzip or Brotli compression",
  category: "perf",
  weight: 6,
  run: (context) => {
    const { assets } = context;
    if (!assets) {
      return notMeasured(
        "perf-asset-compression",
        "Could not measure text compression of assets \u2014 page was not rendered",
        { reason: "Asset data not available" }
      );
    }
    const candidates = assets.filter(
      (a) => a.statusCode >= 200 && a.statusCode < 300 && isTextAsset(a) && !isCompressed(a)
    );
    const { sized, unsized } = partitionBySizeKnown(candidates);
    const uncompressed = sized.filter((a) => (assetContentLength(a) ?? 0) > THRESHOLDS5.minSizeBytes).sort((a, b) => (assetContentLength(b) ?? 0) - (assetContentLength(a) ?? 0));
    const details = {
      assetCount: assets.length,
      uncompressedCount: uncompressed.length,
      unsizedCount: unsized.length,
      thresholds: THRESHOLDS5
    };
    if (uncompressed.length > 0) {
      const listed = uncompressed.slice(0, THRESHOLDS5.maxListed).map((a) => `${a.url} (${assetContentLength(a)} bytes)`);
      const suffix = uncompressed.length > THRESHOLDS5.maxListed ? `, and ${uncompressed.length - THRESHOLDS5.maxListed} more` : "";
      const unsizedNote = unsized.length > 0 ? `; additionally, ${unsizedReason(unsized.length, "text asset")}` : "";
      return warn(
        "perf-asset-compression",
        `${uncompressed.length} text asset(s) served without compression: ${listed.join(", ")}${suffix}${unsizedNote}`,
        { ...details, uncompressed: uncompressed.map((a) => a.url) }
      );
    }
    if (unsized.length > 0) {
      return notMeasured(
        "perf-asset-compression",
        `Could not confirm text compression \u2014 ${unsizedReason(unsized.length, "uncompressed text asset")}`,
        { ...details, unsized: unsized.map((a) => a.url) }
      );
    }
    return pass(
      "perf-asset-compression",
      "All sizable text assets are served with compression",
      details
    );
  }
});

import { defineRule, notMeasured, pass, warn } from "@/audit/engine/define-rule";
import type { AssetInfo } from "@/audit/types";

export const THRESHOLDS6 = {
  /** Static assets should be cacheable for at least one hour */
  minMaxAgeSeconds: 3600,
  /** How many offending asset URLs to list in the result message */
  maxListed: 5
};
export const STATIC_TYPES = /* @__PURE__ */ new Set(["stylesheet", "script", "image", "font"]);
export function parseMaxAge2(cacheControl: string) {
  const match = cacheControl.match(/max-age\s*=\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : -1;
}
export function cacheLifetimeSeconds(asset: AssetInfo) {
  const cacheControl = asset.headers["cache-control"];
  if (!cacheControl) return -1;
  return parseMaxAge2(cacheControl);
}
export const assetCachePolicyRule = defineRule({
  id: "perf-asset-cache-policy",
  name: "Static Asset Cache Policy",
  description: "Checks that static assets (CSS, JS, images, fonts) carry a cache-control max-age of at least 1 hour",
  category: "perf",
  weight: 6,
  run: (context) => {
    const { assets } = context;
    if (!assets) {
      return notMeasured(
        "perf-asset-cache-policy",
        "Could not measure static asset cache policies \u2014 page was not rendered",
        { reason: "Asset data not available" }
      );
    }
    const staticAssets = assets.filter(
      (a) => STATIC_TYPES.has(a.resourceType) && a.statusCode >= 200 && a.statusCode < 300
    );
    const offenders = staticAssets.map((a) => ({ url: a.url, maxAge: cacheLifetimeSeconds(a) })).filter((a) => a.maxAge < THRESHOLDS6.minMaxAgeSeconds).sort((a, b) => a.maxAge - b.maxAge);
    const details = {
      staticAssetCount: staticAssets.length,
      uncachedCount: offenders.length,
      thresholds: THRESHOLDS6
    };
    if (staticAssets.length === 0) {
      return pass("perf-asset-cache-policy", "No static assets observed during render", details);
    }
    if (offenders.length > 0) {
      const listed = offenders.slice(0, THRESHOLDS6.maxListed).map(
        (o) => o.maxAge < 0 ? `${o.url} (no cache-control)` : `${o.url} (max-age=${o.maxAge}s)`
      );
      const suffix = offenders.length > THRESHOLDS6.maxListed ? `, and ${offenders.length - THRESHOLDS6.maxListed} more` : "";
      return warn(
        "perf-asset-cache-policy",
        `${offenders.length} of ${staticAssets.length} static asset(s) lack an efficient cache policy: ${listed.join(", ")}${suffix}`,
        { ...details, offenders: offenders.map((o) => o.url) }
      );
    }
    return pass(
      "perf-asset-cache-policy",
      `All ${staticAssets.length} static asset(s) are cacheable for at least ${THRESHOLDS6.minMaxAgeSeconds / 3600}h`,
      details
    );
  }
});

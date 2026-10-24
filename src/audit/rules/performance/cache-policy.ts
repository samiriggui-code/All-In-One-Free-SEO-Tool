import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function parseMaxAge(cacheControl: string) {
  const match = cacheControl.match(/max-age\s*=\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : -1;
}
export const cachePolicyRule = defineRule({
  id: "perf-cache-policy",
  name: "Cache Policy",
  description: "Checks HTTP caching headers (cache-control, expires, etag, last-modified)",
  category: "perf",
  weight: 7,
  run: (context) => {
    const cacheControl = (context.headers["cache-control"] || "").toLowerCase();
    const expires = context.headers["expires"] || "";
    const etag = context.headers["etag"] || "";
    const lastModified = context.headers["last-modified"] || "";
    const hasCacheControl = cacheControl.length > 0;
    const hasExpires = expires.length > 0;
    const hasEtag = etag.length > 0;
    const hasLastModified = lastModified.length > 0;
    const hasAnyCachingHeader = hasCacheControl || hasExpires || hasEtag || hasLastModified;
    const details = {
      cacheControl: cacheControl || "not set",
      expires: expires || "not set",
      etag: etag ? "present" : "not set",
      lastModified: lastModified || "not set"
    };
    if (!hasAnyCachingHeader) {
      return warn(
        "perf-cache-policy",
        "No caching headers found \u2014 browsers cannot cache this response efficiently",
        details
      );
    }
    if (cacheControl.includes("no-store") || cacheControl.includes("no-cache")) {
      return pass(
        "perf-cache-policy",
        `Cache policy set to "${cacheControl}" \u2014 appropriate for dynamic HTML content`,
        details
      );
    }
    if (hasCacheControl) {
      const maxAge = parseMaxAge(cacheControl);
      if (maxAge > 0) {
        return pass(
          "perf-cache-policy",
          `Cache policy configured with max-age=${maxAge}s`,
          { ...details, maxAgeSeconds: maxAge }
        );
      }
      if (maxAge === 0) {
        return pass(
          "perf-cache-policy",
          "Cache-control set with max-age=0 \u2014 revalidation required on every request",
          { ...details, maxAgeSeconds: 0 }
        );
      }
    }
    if (hasEtag || hasLastModified) {
      return pass(
        "perf-cache-policy",
        `Validation caching enabled (${hasEtag ? "ETag" : ""}${hasEtag && hasLastModified ? ", " : ""}${hasLastModified ? "Last-Modified" : ""})`,
        details
      );
    }
    if (hasExpires) {
      return pass(
        "perf-cache-policy",
        `Cache expiry set via Expires header: ${expires}`,
        details
      );
    }
    return warn(
      "perf-cache-policy",
      "Cache-control header present but no effective caching directives found",
      details
    );
  }
});

import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const brotliRule = defineRule({
  id: "perf-brotli",
  name: "Brotli Compression",
  description: "Checks if Brotli compression is used instead of gzip for better compression",
  category: "perf",
  weight: 5,
  run: (context) => {
    const encoding = (context.headers["content-encoding"] || "").toLowerCase().trim();
    const details = {
      contentEncoding: encoding || "none"
    };
    if (!encoding) {
      return warn(
        "perf-brotli",
        "No compression detected \u2014 consider enabling Brotli for optimal transfer size",
        details
      );
    }
    const encodingParts = encoding.split(",").map((e) => e.trim());
    const usesBrotli = encodingParts.some((e) => e === "br");
    if (usesBrotli) {
      return pass(
        "perf-brotli",
        "Brotli compression is active \u2014 optimal text compression",
        details
      );
    }
    const usesGzip = encodingParts.some((e) => e === "gzip");
    if (usesGzip) {
      return warn(
        "perf-brotli",
        "Using gzip but not Brotli \u2014 Brotli gives ~15-20% better compression for text assets",
        { ...details, currentEncoding: "gzip", recommendation: "br" }
      );
    }
    return warn(
      "perf-brotli",
      `Using "${encoding}" compression \u2014 consider Brotli for better compression ratios`,
      details
    );
  }
});

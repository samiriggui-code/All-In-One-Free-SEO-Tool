import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const SUPPORTED_ENCODINGS = ["gzip", "br", "deflate", "zstd"];
export const textCompressionRule = defineRule({
  id: "perf-text-compression",
  name: "Text Compression",
  description: "Checks if the response uses text compression (gzip, br, deflate, zstd)",
  category: "perf",
  weight: 8,
  run: (context) => {
    const encoding = (context.headers["content-encoding"] || "").toLowerCase().trim();
    const details = {
      contentEncoding: encoding || "none",
      supportedEncodings: [...SUPPORTED_ENCODINGS]
    };
    if (!encoding) {
      return warn(
        "perf-text-compression",
        "No text compression detected \u2014 page may load slowly without gzip or Brotli",
        details
      );
    }
    const encodingParts = encoding.split(",").map((e) => e.trim());
    const matchedEncoding = encodingParts.find(
      (e) => SUPPORTED_ENCODINGS.some((supported) => e === supported)
    );
    if (matchedEncoding) {
      return pass(
        "perf-text-compression",
        `Text compression enabled (${matchedEncoding})`,
        { ...details, detectedEncoding: matchedEncoding }
      );
    }
    return warn(
      "perf-text-compression",
      `Unrecognized content-encoding "${encoding}" \u2014 expected gzip, br, deflate, or zstd`,
      details
    );
  }
});

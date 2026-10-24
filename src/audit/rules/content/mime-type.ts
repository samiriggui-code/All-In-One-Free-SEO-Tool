import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export function prescanMetaCharset(html: string) {
  const head = Buffer.from(html, "utf8").subarray(0, 1024).toString("latin1");
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const match = tag.match(/charset\s*=\s*["']?\s*([\w.:-]+)/i);
    if (match) return match[1];
  }
  return void 0;
}
export const mimeTypeRule = defineRule({
  id: "content-mime-type",
  name: "MIME Type Validation",
  description: "Validates Content-Type header for correct MIME type and charset",
  category: "content",
  weight: 5,
  run: async (context) => {
    const { headers, html } = context;
    const contentType = headers["content-type"] || headers["Content-Type"] || headers["CONTENT-TYPE"];
    if (!contentType) {
      return fail("content-mime-type", "Missing Content-Type header", {
        header: null,
        recommendation: "Configure your server to send the Content-Type header with every response",
        impact: "Missing Content-Type can cause browsers to misinterpret the document type"
      });
    }
    const parts = contentType.toLowerCase().split(";").map((s) => s.trim());
    const mimeType = parts[0];
    if (!mimeType.includes("text/html") && !mimeType.includes("application/xhtml+xml")) {
      return fail("content-mime-type", `Incorrect MIME type: ${mimeType}`, {
        header: contentType,
        mimeType,
        expectedMimeTypes: ["text/html", "application/xhtml+xml"],
        recommendation: "HTML pages should be served with text/html or application/xhtml+xml MIME type",
        impact: "Incorrect MIME types can break page rendering and confuse search engine crawlers"
      });
    }
    const charsetPart = parts.find((p) => p.startsWith("charset="));
    const headerCharset = charsetPart?.replace("charset=", "").trim();
    const metaCharset = headerCharset ? void 0 : prescanMetaCharset(html);
    const charset = headerCharset ?? metaCharset;
    const charsetSource = headerCharset ? "header" : metaCharset ? "meta" : null;
    if (!charset) {
      return warn("content-mime-type", "Content-Type header missing charset specification", {
        header: contentType,
        mimeType,
        charset: null,
        recommendation: 'Add charset=utf-8 to Content-Type header: "text/html; charset=utf-8"',
        impact: "Missing charset can cause character encoding issues for international content"
      });
    }
    const normalizedCharset = charset.replace(/["']/g, "").toLowerCase();
    const isUtf8 = normalizedCharset === "utf-8" || normalizedCharset === "utf8";
    if (!isUtf8) {
      return warn(
        "content-mime-type",
        `Non-UTF-8 charset detected: ${charset}`,
        {
          header: contentType,
          mimeType,
          charset,
          charsetSource,
          recommendation: 'Use UTF-8 encoding for maximum compatibility: "text/html; charset=utf-8"',
          impact: "Non-UTF-8 charsets may cause display issues with special characters"
        }
      );
    }
    return pass(
      "content-mime-type",
      charsetSource === "meta" ? "Content-Type is correct; UTF-8 is declared by <meta> within the first 1,024 bytes" : "Content-Type header is correctly configured",
      {
        header: contentType,
        mimeType,
        charset,
        charsetSource
      }
    );
  }
});

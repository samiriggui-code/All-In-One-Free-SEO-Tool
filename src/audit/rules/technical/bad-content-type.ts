import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const VALID_HTML_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml"
];
export const badContentTypeRule = defineRule({
  id: "technical-bad-content-type",
  name: "Content-Type Header Check",
  description: "Checks that the Content-Type header is correct for an HTML page",
  category: "technical",
  weight: 8,
  run: async (context) => {
    const contentType = context.headers["content-type"];
    if (!contentType) {
      return warn(
        "technical-bad-content-type",
        "Content-Type header is missing",
        {
          contentType: null,
          fix: 'Add a Content-Type header to the response (e.g., "text/html; charset=utf-8")'
        }
      );
    }
    const mediaType = contentType.split(";")[0].trim().toLowerCase();
    const isValid = VALID_HTML_CONTENT_TYPES.some(
      (valid) => mediaType === valid
    );
    if (isValid) {
      return pass(
        "technical-bad-content-type",
        `Content-Type is correct: ${contentType}`,
        { contentType, mediaType }
      );
    }
    return fail(
      "technical-bad-content-type",
      `Incorrect Content-Type "${contentType}" for an HTML page`,
      {
        contentType,
        mediaType,
        expected: VALID_HTML_CONTENT_TYPES,
        fix: `Change the Content-Type header from "${mediaType}" to "text/html; charset=utf-8"`
      }
    );
  }
});

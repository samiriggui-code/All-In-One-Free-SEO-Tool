import { defineRule, fail, notMeasured, pass } from "@/audit/engine/define-rule";

export const emptyHtmlRule = defineRule({
  id: "technical-empty-html",
  name: "Empty HTML",
  description: "Checks that the page returns meaningful HTML content rather than an empty document",
  category: "technical",
  weight: 10,
  run: async (context) => {
    const { html, $, statusCode } = context;
    if (typeof html !== "string" || !$) {
      return notMeasured(
        "technical-empty-html",
        "Page HTML was not collected; cannot check for empty HTML"
      );
    }
    if (statusCode !== 200) {
      return pass(
        "technical-empty-html",
        `Page returns ${statusCode}; empty HTML check applies to 200 responses`,
        { statusCode }
      );
    }
    if (html.trim().length === 0) {
      return fail(
        "technical-empty-html",
        "Page returns 200 but the response HTML is missing (empty body)",
        {
          statusCode,
          htmlLength: html.length,
          fix: "Investigate why the server returns no HTML; restore the content or serve a 404/410 if it should not exist"
        }
      );
    }
    const headContent = ($("head").html() ?? "").trim();
    const bodyContent = ($("body").html() ?? "").trim();
    if (headContent.length === 0 && bodyContent.length === 0) {
      return fail(
        "technical-empty-html",
        "Page returns 200 but the HTML has no meaningful content (empty <head> and empty or missing <body>)",
        {
          statusCode,
          htmlLength: html.length,
          fix: "Investigate why the document renders no content; restore the content or serve a 404/410 if it should not exist"
        }
      );
    }
    return pass("technical-empty-html", "Page contains meaningful HTML content", {
      statusCode,
      htmlLength: html.length
    });
  }
});

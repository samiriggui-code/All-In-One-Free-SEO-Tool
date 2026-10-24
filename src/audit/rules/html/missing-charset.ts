import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const missingCharsetRule = defineRule({
  id: "htmlval-missing-charset",
  name: "Charset Declaration",
  description: "Checks for a <meta charset> or Content-Type meta tag in the document head",
  category: "htmlval",
  weight: 15,
  run: async (context) => {
    const { $, headers } = context;
    const metaCharset = $("head meta[charset]");
    if (metaCharset.length > 0) {
      return pass(
        "htmlval-missing-charset",
        "Charset is declared via <meta charset>",
        { method: "meta-charset", value: metaCharset.attr("charset") }
      );
    }
    const httpEquiv = $('head meta[http-equiv="Content-Type"]');
    if (httpEquiv.length > 0) {
      return pass(
        "htmlval-missing-charset",
        'Charset is declared via <meta http-equiv="Content-Type">',
        { method: "http-equiv", value: httpEquiv.attr("content") }
      );
    }
    const contentType = headers["content-type"] || "";
    if (/charset=/i.test(contentType)) {
      return warn(
        "htmlval-missing-charset",
        'Charset is only declared in the HTTP Content-Type header, not in HTML. Add <meta charset="utf-8"> to <head>',
        { method: "header-only", headerValue: contentType }
      );
    }
    return fail(
      "htmlval-missing-charset",
      'No charset declaration found. Add <meta charset="utf-8"> as the first element in <head>',
      { found: false }
    );
  }
});

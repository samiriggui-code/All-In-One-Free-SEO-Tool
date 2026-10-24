import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const xmlLangMismatchRule = defineRule({
  id: "a11y-xml-lang-mismatch",
  name: "lang and xml:lang Mismatch",
  description: "Checks that lang and xml:lang on the html element name the same language",
  category: "a11y",
  weight: 3,
  run: (context) => {
    const html = context.$("html");
    const lang = html.attr("lang")?.trim().toLowerCase();
    const xml = html.attr("xml:lang")?.trim().toLowerCase();
    if (!lang || !xml) {
      return pass("a11y-xml-lang-mismatch", "html does not set both lang and xml:lang", {
        lang: lang ?? null,
        xmlLang: xml ?? null
      });
    }
    if (lang === xml) {
      return pass("a11y-xml-lang-mismatch", `lang and xml:lang are both ${lang}`, {
        lang,
        xmlLang: xml
      });
    }
    return warn("a11y-xml-lang-mismatch", `lang="${lang}" disagrees with xml:lang="${xml}"`, {
      lang,
      xmlLang: xml,
      recommendation: "Set lang and xml:lang to the same language tag, or drop xml:lang."
    });
  }
});

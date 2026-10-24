import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const formHttpsRule = defineRule({
  id: "security-form-https",
  name: "Form HTTPS",
  description: "Checks that form actions use HTTPS",
  category: "security",
  weight: 5,
  run: (context) => {
    const { $, url } = context;
    const isHttpsPage = url.startsWith("https://");
    const forms = $("form");
    if (forms.length === 0) {
      return pass("security-form-https", "No forms found on page", { formCount: 0 });
    }
    const insecureForms: { action: string; method: string; id: string; name: string; }[] = [];
    forms.each((_, el) => {
      const $form = $(el);
      const action = $form.attr("action") || "";
      const method = ($form.attr("method") || "get").toLowerCase();
      if (!action || action.startsWith("#") || action.startsWith("/") || action.startsWith(".")) {
        return;
      }
      if (action.toLowerCase().startsWith("http://")) {
        insecureForms.push({
          action,
          method,
          id: $form.attr("id") || "",
          name: $form.attr("name") || ""
        });
      }
    });
    if (insecureForms.length === 0) {
      return pass("security-form-https", `All ${forms.length} form(s) use secure actions`, {
        formCount: forms.length,
        isHttpsPage
      });
    }
    const hasInsecurePost = insecureForms.some((f) => f.method === "post");
    const message = `${insecureForms.length} form(s) submit to insecure HTTP URLs`;
    const details = {
      insecureForms,
      totalForms: forms.length,
      isHttpsPage
    };
    return hasInsecurePost ? fail("security-form-https", message, details) : warn("security-form-https", message, details);
  }
});

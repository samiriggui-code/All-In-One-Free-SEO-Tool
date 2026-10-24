import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const passwordHttpRule = defineRule({
  id: "security-password-http",
  name: "Password Input on HTTP",
  description: "Checks if password inputs are served over insecure HTTP",
  category: "security",
  weight: 10,
  run: (context) => {
    const { $, url } = context;
    if (url.startsWith("https://")) {
      return pass(
        "security-password-http",
        "Page is served over HTTPS; password inputs are secure",
        { isHttps: true }
      );
    }
    const passwordInputs = $('input[type="password"]');
    const count = passwordInputs.length;
    if (count === 0) {
      return pass(
        "security-password-http",
        "No password input fields found on this HTTP page",
        { isHttps: false, passwordInputCount: 0 }
      );
    }
    return fail(
      "security-password-http",
      `Found ${count} password input(s) on an HTTP page; credentials will be transmitted in plaintext`,
      {
        isHttps: false,
        passwordInputCount: count,
        recommendation: "Migrate the page to HTTPS to protect user credentials from interception"
      }
    );
  }
});

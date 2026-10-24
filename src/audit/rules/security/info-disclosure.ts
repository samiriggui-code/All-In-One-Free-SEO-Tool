import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const ALWAYS_DISCLOSING = [
  "x-powered-by",
  "x-aspnet-version",
  "x-aspnetmvc-version",
  "x-generator",
  "x-drupal-cache"
];
export const VERSION_PATTERN = /\d+\.\d+/;
export const infoDisclosureRule = defineRule({
  id: "security-info-disclosure",
  name: "Software Version Disclosure",
  description: "Checks that response headers do not advertise the server software and its version",
  category: "security",
  weight: 3,
  run: (context) => {
    const { headers, url } = context;
    const disclosed = [];
    for (const name of ALWAYS_DISCLOSING) {
      const value = headers[name];
      if (value) disclosed.push({ header: name, value });
    }
    const server = headers["server"];
    if (server && VERSION_PATTERN.test(server)) {
      disclosed.push({ header: "server", value: server });
    }
    const details = { url, disclosed };
    if (disclosed.length > 0) {
      const summary = disclosed.map((d) => `${d.header}: ${d.value}`).join(", ");
      return warn(
        "security-info-disclosure",
        `Response headers disclose the software stack (${summary}). Suppress or genericise these headers.`,
        details
      );
    }
    return pass(
      "security-info-disclosure",
      "Response headers do not disclose software versions",
      details
    );
  }
});

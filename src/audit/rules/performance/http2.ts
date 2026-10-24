import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const http2Rule = defineRule({
  id: "perf-http2",
  name: "HTTP/2+ Support",
  description: "Checks for indicators of HTTP/2 or HTTP/3 protocol support (alt-svc header)",
  category: "perf",
  weight: 5,
  run: (context) => {
    const altSvc = context.headers["alt-svc"] || "";
    const details = {
      altSvc: altSvc || "not set"
    };
    if (altSvc) {
      const supportsH3 = altSvc.includes("h3");
      if (supportsH3) {
        return pass(
          "perf-http2",
          "HTTP/3 support advertised via alt-svc header \u2014 optimal protocol performance",
          { ...details, protocol: "h3" }
        );
      }
      return pass(
        "perf-http2",
        `alt-svc header present ("${altSvc.length > 80 ? altSvc.slice(0, 80) + "..." : altSvc}") \u2014 modern protocol support indicated`,
        details
      );
    }
    return warn(
      "perf-http2",
      "No alt-svc header found \u2014 server may not support HTTP/2 or HTTP/3 (informational)",
      details
    );
  }
});

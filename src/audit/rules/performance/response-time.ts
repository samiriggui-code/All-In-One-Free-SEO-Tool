import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const THRESHOLDS9 = {
  good: 500,
  warning: 1e3
};
export const responseTimeRule = defineRule({
  id: "perf-response-time",
  name: "Response Time",
  description: "Checks page response time against performance thresholds",
  category: "perf",
  weight: 7,
  run: (context) => {
    const responseTime = context.responseTime;
    const details = {
      responseTimeMs: responseTime,
      thresholds: THRESHOLDS9
    };
    if (responseTime > THRESHOLDS9.warning) {
      return fail(
        "perf-response-time",
        `Response time is ${responseTime}ms (threshold: ${THRESHOLDS9.warning}ms) \u2014 consider server-side optimizations, caching, or a CDN`,
        details
      );
    }
    if (responseTime > THRESHOLDS9.good) {
      return warn(
        "perf-response-time",
        `Response time is ${responseTime}ms (recommended: <${THRESHOLDS9.good}ms) \u2014 may impact user experience`,
        details
      );
    }
    return pass(
      "perf-response-time",
      `Response time is ${responseTime}ms \u2014 within optimal range`,
      details
    );
  }
});

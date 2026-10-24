import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const LCP_GOOD = 2500;
export const LCP_POOR = 4e3;
export const lcpRule = defineRule({
  id: "cwv-lcp",
  name: "Largest Contentful Paint (LCP)",
  description: "Measures loading performance by checking when the largest content element becomes visible",
  category: "perf",
  weight: 25,
  run: async (context) => {
    const { cwv } = context;
    const lcp = cwv.lcp;
    if (lcp === void 0) {
      return notMeasured("cwv-lcp", "Could not measure Largest Contentful Paint", {
        metric: "LCP",
        reason: "Metric not available"
      });
    }
    const lcpSeconds = (lcp / 1e3).toFixed(2);
    if (lcp < LCP_GOOD) {
      return pass("cwv-lcp", `LCP is ${lcpSeconds}s (good, under 2.5s)`, {
        metric: "LCP",
        value: lcp,
        valueFormatted: `${lcpSeconds}s`,
        threshold: {
          good: LCP_GOOD,
          poor: LCP_POOR
        }
      });
    }
    if (lcp <= LCP_POOR) {
      return warn(
        "cwv-lcp",
        `LCP is ${lcpSeconds}s (needs improvement, should be under 2.5s)`,
        {
          metric: "LCP",
          value: lcp,
          valueFormatted: `${lcpSeconds}s`,
          threshold: {
            good: LCP_GOOD,
            poor: LCP_POOR
          }
        }
      );
    }
    return fail(
      "cwv-lcp",
      `LCP is ${lcpSeconds}s (poor, should be under 2.5s)`,
      {
        metric: "LCP",
        value: lcp,
        valueFormatted: `${lcpSeconds}s`,
        threshold: {
          good: LCP_GOOD,
          poor: LCP_POOR
        }
      }
    );
  }
});

import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const TTFB_GOOD = 800;
export const TTFB_POOR = 1800;
export const ttfbRule = defineRule({
  id: "cwv-ttfb",
  name: "Time to First Byte (TTFB)",
  description: "Measures server response time by checking how long until the first byte is received",
  category: "perf",
  weight: 15,
  run: async (context) => {
    const { cwv } = context;
    const ttfb = cwv.ttfb;
    if (ttfb === void 0) {
      return notMeasured("cwv-ttfb", "Could not measure Time to First Byte", {
        metric: "TTFB",
        reason: "Metric not available"
      });
    }
    if (ttfb < TTFB_GOOD) {
      return pass("cwv-ttfb", `TTFB is ${ttfb}ms (good, under 800ms)`, {
        metric: "TTFB",
        value: ttfb,
        valueFormatted: `${ttfb}ms`,
        threshold: {
          good: TTFB_GOOD,
          poor: TTFB_POOR
        }
      });
    }
    if (ttfb <= TTFB_POOR) {
      return warn(
        "cwv-ttfb",
        `TTFB is ${ttfb}ms (needs improvement, should be under 800ms)`,
        {
          metric: "TTFB",
          value: ttfb,
          valueFormatted: `${ttfb}ms`,
          threshold: {
            good: TTFB_GOOD,
            poor: TTFB_POOR
          }
        }
      );
    }
    return fail(
      "cwv-ttfb",
      `TTFB is ${ttfb}ms (poor, should be under 800ms)`,
      {
        metric: "TTFB",
        value: ttfb,
        valueFormatted: `${ttfb}ms`,
        threshold: {
          good: TTFB_GOOD,
          poor: TTFB_POOR
        }
      }
    );
  }
});

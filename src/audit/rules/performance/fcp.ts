import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const FCP_GOOD = 1800;
export const FCP_POOR = 3e3;
export const fcpRule = defineRule({
  id: "cwv-fcp",
  name: "First Contentful Paint (FCP)",
  description: "Measures perceived load speed by checking when the first content is rendered",
  category: "perf",
  weight: 15,
  run: async (context) => {
    const { cwv } = context;
    const fcp = cwv.fcp;
    if (fcp === void 0) {
      return notMeasured("cwv-fcp", "Could not measure First Contentful Paint", {
        metric: "FCP",
        reason: "Metric not available"
      });
    }
    const fcpSeconds = (fcp / 1e3).toFixed(2);
    if (fcp < FCP_GOOD) {
      return pass("cwv-fcp", `FCP is ${fcpSeconds}s (good, under 1.8s)`, {
        metric: "FCP",
        value: fcp,
        valueFormatted: `${fcpSeconds}s`,
        threshold: {
          good: FCP_GOOD,
          poor: FCP_POOR
        }
      });
    }
    if (fcp <= FCP_POOR) {
      return warn(
        "cwv-fcp",
        `FCP is ${fcpSeconds}s (needs improvement, should be under 1.8s)`,
        {
          metric: "FCP",
          value: fcp,
          valueFormatted: `${fcpSeconds}s`,
          threshold: {
            good: FCP_GOOD,
            poor: FCP_POOR
          }
        }
      );
    }
    return fail(
      "cwv-fcp",
      `FCP is ${fcpSeconds}s (poor, should be under 1.8s)`,
      {
        metric: "FCP",
        value: fcp,
        valueFormatted: `${fcpSeconds}s`,
        threshold: {
          good: FCP_GOOD,
          poor: FCP_POOR
        }
      }
    );
  }
});

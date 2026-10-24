import { defineRule, fail, notMeasured, pass, warn } from "@/audit/engine/define-rule";

export const INP_GOOD = 200;
export const INP_POOR = 500;
export const inpRule = defineRule({
  id: "cwv-inp",
  name: "Interaction to Next Paint (INP)",
  description: "Measures responsiveness by checking the latency of user interactions",
  category: "perf",
  weight: 20,
  run: async (context) => {
    const { cwv } = context;
    const inp = cwv.inp;
    if (inp === void 0) {
      return notMeasured(
        "cwv-inp",
        "INP not measured - it requires real user interaction, which an automated crawl does not perform. Use field data (CrUX or RUM) for INP, or --simulate-interaction for an indicative lab value.",
        {
          metric: "INP",
          reason: "INP requires user interaction and cannot be measured in a lab crawl"
        }
      );
    }
    if (cwv.inpSynthetic) {
      return notMeasured(
        "cwv-inp",
        `INP is ${inp}ms from a synthetic interaction (indicative only - not real user data)`,
        {
          metric: "INP",
          value: inp,
          valueFormatted: `${inp}ms`,
          synthetic: true,
          reason: "Measured from a crawler-generated interaction, which reflects one arbitrary element rather than real usage",
          threshold: { good: INP_GOOD, poor: INP_POOR }
        }
      );
    }
    if (inp < INP_GOOD) {
      return pass("cwv-inp", `INP is ${inp}ms (good, under 200ms)`, {
        metric: "INP",
        value: inp,
        valueFormatted: `${inp}ms`,
        threshold: {
          good: INP_GOOD,
          poor: INP_POOR
        }
      });
    }
    if (inp <= INP_POOR) {
      return warn(
        "cwv-inp",
        `INP is ${inp}ms (needs improvement, should be under 200ms)`,
        {
          metric: "INP",
          value: inp,
          valueFormatted: `${inp}ms`,
          threshold: {
            good: INP_GOOD,
            poor: INP_POOR
          }
        }
      );
    }
    return fail(
      "cwv-inp",
      `INP is ${inp}ms (poor, should be under 200ms)`,
      {
        metric: "INP",
        value: inp,
        valueFormatted: `${inp}ms`,
        threshold: {
          good: INP_GOOD,
          poor: INP_POOR
        }
      }
    );
  }
});

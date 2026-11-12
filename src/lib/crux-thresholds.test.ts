import { describe, expect, it } from "vitest";
import { labVerdict, ratingForMetric } from "./crux-thresholds";

describe("CWV thresholds", () => {
  it("rates field data on Google's limits", () => {
    expect(ratingForMetric("lcp", 2500)).toBe("good");
    expect(ratingForMetric("lcp", 4000)).toBe("needs_improvement");
    expect(ratingForMetric("lcp", 4001)).toBe("poor");
    expect(ratingForMetric("inp", 201)).toBe("needs_improvement");
    expect(ratingForMetric("cls", 0.1)).toBe("good");
    expect(ratingForMetric("ttfb", 1801)).toBe("poor");
  });

  it("gives lab verdicts on the same limits, unknown without a value", () => {
    expect(labVerdict("fcp", 1800)).toBe("good");
    expect(labVerdict("fcp", 3000)).toBe("needs-improvement");
    expect(labVerdict("cls", 0.3)).toBe("poor");
    expect(labVerdict("lcp", null)).toBe("unknown");
  });
});

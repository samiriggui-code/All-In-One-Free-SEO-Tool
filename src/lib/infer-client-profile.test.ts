import { describe, expect, it } from "vitest";
import { inferClientProfile } from "./infer-client-profile";

describe("inferClientProfile", () => {
  it("detects VTC as local with business type", () => {
    const r = inferClientProfile({
      description:
        "Chauffeur privé VTC à Paris : transferts aéroports Orly, CDG, Beauvais.",
      techStack: null,
    });
    expect(r.niche).toBe("local");
    expect(r.businessType).toMatch(/VTC/i);
  });

  it("uses shopify stack for ecommerce", () => {
    const r = inferClientProfile({
      techStack: ["Shopify"],
      description: "Online store",
    });
    expect(r.niche).toBe("ecommerce");
  });
});

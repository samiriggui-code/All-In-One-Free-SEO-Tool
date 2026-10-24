import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const ISOLATING_VALUES = ["same-origin", "same-origin-allow-popups"];
export const coopRule = defineRule({
  id: "security-coop",
  name: "Cross-Origin-Opener-Policy",
  description: "Checks that Cross-Origin-Opener-Policy isolates the page from windows that open it",
  category: "security",
  weight: 3,
  run: (context) => {
    const { headers, url } = context;
    const coop = headers["cross-origin-opener-policy"]?.trim();
    const value = coop?.split(";")[0]?.trim().toLowerCase();
    const details = { url, value: coop ?? null };
    if (!value) {
      return warn(
        "security-coop",
        "Missing Cross-Origin-Opener-Policy header. Pages that open this one keep a reference to its window.",
        details
      );
    }
    if (value === "unsafe-none") {
      return warn(
        "security-coop",
        'Cross-Origin-Opener-Policy is "unsafe-none", which is the default and provides no isolation.',
        details
      );
    }
    if (!ISOLATING_VALUES.includes(value)) {
      return warn(
        "security-coop",
        `Cross-Origin-Opener-Policy has unrecognised value "${coop}". Expected same-origin or same-origin-allow-popups.`,
        details
      );
    }
    return pass("security-coop", `Cross-Origin-Opener-Policy is "${value}"`, details);
  }
});

import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const accesskeyUniqueRule = defineRule({
  id: "a11y-accesskey-unique",
  name: "Unique Access Keys",
  description: "Checks that no accesskey value is assigned to more than one element",
  category: "a11y",
  weight: 2,
  run: (context) => {
    const { $, url } = context;
    const counts = /* @__PURE__ */ new Map();
    $("[accesskey]").each((_, el) => {
      const key = $(el).attr("accesskey")?.trim().toLowerCase();
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const duplicates = Array.from(counts).filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
    const details = { url, total: counts.size, duplicates };
    if (duplicates.length > 0) {
      return warn(
        "a11y-accesskey-unique",
        `Access key(s) reused: ${duplicates.map((d) => `"${d.key}" (${d.count}x)`).join(", ")}`,
        details
      );
    }
    return pass(
      "a11y-accesskey-unique",
      counts.size > 0 ? `All ${counts.size} access key(s) are unique` : "No access keys in use",
      details
    );
  }
});

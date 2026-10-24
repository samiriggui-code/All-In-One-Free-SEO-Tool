import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export function libraryOf(src: string) {
  const file = (src.split("?")[0].split("/").pop() ?? "").toLowerCase();
  if (file.startsWith("react-dom")) return "react-dom";
  if (/^react([.-]|$)/.test(file)) return "react";
  if (/^jquery([.-]|$)/.test(file)) return "jquery";
  if (file.startsWith("lodash")) return "lodash";
  if (file.startsWith("moment")) return "moment";
  if (/^vue([.-]|$)/.test(file)) return "vue";
  if (file.startsWith("angular")) return "angular";
  return null;
}
export const duplicateJsRule = defineRule({
  id: "perf-duplicate-js",
  name: "Duplicate JavaScript Libraries",
  description: "Checks that a known library is not loaded from more than one script URL",
  category: "perf",
  weight: 4,
  run: (context) => {
    const byLibrary = /* @__PURE__ */ new Map();
    context.$("script[src]").each((_, el) => {
      const src = context.$(el).attr("src") || "";
      const library = libraryOf(src);
      if (!library) return;
      const list = byLibrary.get(library) ?? [];
      if (!list.includes(src)) list.push(src);
      byLibrary.set(library, list);
    });
    const duplicates = [...byLibrary.entries()].filter(([, srcs]) => srcs.length > 1);
    if (duplicates.length === 0) {
      return pass("perf-duplicate-js", "No known library is loaded more than once", {
        libraries: [...byLibrary.keys()]
      });
    }
    const summary = duplicates.map(([name, srcs]) => `${name} (${srcs.length})`).join(", ");
    return warn("perf-duplicate-js", `Library loaded more than once: ${summary}`, {
      duplicates: Object.fromEntries(duplicates),
      recommendation: "Keep one script URL per library, and one version of it."
    });
  }
});

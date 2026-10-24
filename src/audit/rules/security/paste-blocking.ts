import { defineRule, fail, pass } from "@/audit/engine/define-rule";

export const BLOCKING_PATTERN = /return\s+false|preventDefault/i;
export const pasteBlockingRule = defineRule({
  id: "security-paste-blocking",
  name: "Inputs Allow Pasting",
  description: "Checks that input fields do not prevent pasting",
  category: "security",
  weight: 2,
  run: (context) => {
    const { $, url } = context;
    const blocked: Array<{ handler: string; name?: string | undefined; type?: string | undefined; tag: string; }> = [];
    $("input[onpaste], textarea[onpaste]").each((_, el) => {
      const $el = $(el);
      const handler = $el.attr("onpaste") ?? "";
      if (!BLOCKING_PATTERN.test(handler)) return;
      blocked.push({
        tag: el.tagName ?? "input",
        ...$el.attr("type") && { type: $el.attr("type") },
        ...$el.attr("name") && { name: $el.attr("name") },
        handler: handler.slice(0, 120)
      });
    });
    const details = { url, blocked };
    if (blocked.length > 0) {
      const passwordFields = blocked.filter((b) => b.type === "password").length;
      return fail(
        "security-paste-blocking",
        `${blocked.length} input(s) block pasting${passwordFields > 0 ? `, including ${passwordFields} password field(s)` : ""}. This breaks password managers and encourages weaker passwords.`,
        details
      );
    }
    return pass("security-paste-blocking", "No inputs block pasting", details);
  }
});

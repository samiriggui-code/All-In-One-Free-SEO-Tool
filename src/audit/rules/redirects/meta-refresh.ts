import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";

export const metaRefreshRule = defineRule({
  id: "redirect-meta-refresh",
  name: "No Meta Refresh Redirect",
  description: "Checks for meta refresh redirects that should use server-side 301 redirects",
  category: "redirect",
  weight: 15,
  run: (context) => {
    const { $ } = context;
    const metaRefresh = $('meta[http-equiv="refresh"]');
    if (metaRefresh.length === 0) {
      return pass("redirect-meta-refresh", "No meta refresh redirect found");
    }
    const content = metaRefresh.first().attr("content") || "";
    const delayMatch = content.match(/^\s*(\d+)\s*(;|$)/);
    const delay = delayMatch ? parseInt(delayMatch[1], 10) : 0;
    const urlMatch = content.match(/;\s*url\s*=\s*['"]?([^'">\s]+)/i);
    const targetUrl = urlMatch ? urlMatch[1] : void 0;
    const details = {
      content,
      delay,
      ...targetUrl && { targetUrl }
    };
    if (delay === 0) {
      return fail(
        "redirect-meta-refresh",
        "Meta refresh with delay 0 detected; use a server-side 301 redirect instead",
        details
      );
    }
    return warn(
      "redirect-meta-refresh",
      `Meta refresh with ${delay}s delay detected; search engines may not follow this redirect`,
      details
    );
  }
});

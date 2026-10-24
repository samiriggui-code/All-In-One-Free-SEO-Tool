import { defineRule, pass, warn } from "@/audit/engine/define-rule";

export const BRANDS = [
  { label: /sign in with google|continue with google|log in with google/i, hosts: ["google.com", "accounts.google.com"] },
  { label: /sign in with microsoft|continue with microsoft|log in with microsoft/i, hosts: ["microsoft.com", "login.microsoftonline.com", "live.com"] },
  { label: /sign in with apple|continue with apple|log in with apple/i, hosts: ["apple.com", "appleid.apple.com"] }
];
export function hostOf(href: string, pageUrl: string) {
  try {
    return new URL(href, pageUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}
export function isBrandHost(host: string, brand: { label?: RegExp; hosts: string[] }) {
  return brand.hosts.some((allowed: string) => host === allowed || host.endsWith(`.${allowed}`));
}
export const brandImpersonationRule = defineRule({
  id: "security-brand-impersonation",
  name: "Brand Sign-In Destination",
  description: "Checks that brand sign-in links point at the brand or stay on this host",
  category: "security",
  weight: 6,
  run: (context) => {
    let pageHost = "";
    try {
      pageHost = new URL(context.url).hostname.toLowerCase();
    } catch {
      pageHost = "";
    }
    const found: { text: string; host: string; }[] = [];
    context.$("a[href], form[action]").each((_, el) => {
      const node = context.$(el);
      const text = node.text().replace(/\s+/g, " ").trim();
      const brand = BRANDS.find((item) => item.label.test(text));
      if (!brand) return;
      const href = node.attr("href") || node.attr("action") || "";
      const host = hostOf(href, context.url);
      if (!host || host === pageHost || isBrandHost(host, brand)) return;
      if (found.length < 5) found.push({ text: text.slice(0, 80), host });
    });
    if (found.length === 0) {
      return pass("security-brand-impersonation", "Brand sign-in links point at the brand or this host", {
        found: []
      });
    }
    return warn(
      "security-brand-impersonation",
      `${found.length} brand sign-in control(s) point at an unexpected host`,
      {
        found,
        recommendation: 'Point "Sign in with \u2026" controls at the brand host, or at a URL on your own host that starts the real flow.'
      }
    );
  }
});

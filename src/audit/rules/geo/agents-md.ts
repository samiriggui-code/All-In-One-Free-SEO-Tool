import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { looksLikeHtml, probeOnce } from "@/audit/rules/geo/probe";

export const PATHS = ["/AGENTS.md", "/.well-known/AGENTS.md", "/docs/AGENTS.md"];
export function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
export const agentsMdRule = defineRule({
  id: "geo-agents-md",
  name: "AGENTS.md",
  description: "Checks that the origin publishes an AGENTS.md file rather than an HTML fallback",
  category: "geo",
  weight: 2,
  run: async (context) => {
    const origin = originOf(context.url);
    if (!origin) {
      return pass("geo-agents-md", "Page URL has no origin to probe", { found: false });
    }
    const checks = await Promise.all(
      PATHS.map(async (path3) => {
        const result = await probeOnce(`${origin}${path3}`, {}, context.signal);
        return { path: path3, result };
      })
    );
    const real = checks.find(
      (check) => check.result && check.result.status === 200 && !looksLikeHtml(check.result)
    );
    if (real) {
      return pass("geo-agents-md", `AGENTS.md found at ${real.path}`, { path: real.path });
    }
    const html = checks.find(
      (check) => check.result && check.result.status === 200 && looksLikeHtml(check.result)
    );
    if (html) {
      return warn("geo-agents-md", `${html.path} returned an HTML document instead of the instructions file`, {
        path: html.path,
        recommendation: "Serve AGENTS.md as text or Markdown, not the site HTML fallback."
      });
    }
    return warn("geo-agents-md", "No AGENTS.md at the usual paths", {
      paths: PATHS,
      recommendation: "Add /AGENTS.md describing how an agent should use this site."
    });
  }
});

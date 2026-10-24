import { defineRule, pass, warn } from "@/audit/engine/define-rule";
import { looksLikeHtml, probeOnce } from "@/audit/rules/geo/probe";

export const MANIFESTS = [
  "/.well-known/mcp.json",
  "/.well-known/agent-card.json",
  "/.well-known/agent.json"
];
export const LEGACY = "/.well-known/ai-plugin.json";
export function originOf2(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
export const wellKnownAgentRule = defineRule({
  id: "geo-well-known",
  name: "Well-Known Agent Manifest",
  description: "Checks for an MCP or agent-card manifest under .well-known",
  category: "geo",
  weight: 1,
  run: async (context) => {
    const origin = originOf2(context.url);
    if (!origin) {
      return pass("geo-well-known", "Page URL has no origin to probe", { found: false });
    }
    const found = [];
    for (const path3 of MANIFESTS) {
      const result = await probeOnce(`${origin}${path3}`, {}, context.signal);
      if (result && result.status === 200 && !looksLikeHtml(result)) found.push(path3);
    }
    if (found.length > 0) {
      return pass("geo-well-known", `Agent manifest found: ${found.join(", ")}`, { found });
    }
    const legacy = await probeOnce(`${origin}${LEGACY}`, {}, context.signal);
    if (legacy && legacy.status === 200 && !looksLikeHtml(legacy)) {
      return warn("geo-well-known", "Only a legacy ai-plugin.json manifest was found", {
        found: [LEGACY],
        recommendation: "Replace the ChatGPT plugin file with an MCP server card or an agent card."
      });
    }
    return warn("geo-well-known", "No MCP or agent-card manifest under .well-known", {
      found: [],
      recommendation: "Publish /.well-known/mcp.json or /.well-known/agent-card.json if agents should call this site."
    });
  }
});

import { defineRule, fail, pass, warn } from "@/audit/engine/define-rule";
import { fetchPage } from "@/audit/crawler/fetcher";

export const AI_BOTS_BY_PURPOSE = {
  citation: [
    "OAI-SearchBot",
    // ChatGPT search index
    "ChatGPT-User",
    // ChatGPT user-triggered browsing
    "PerplexityBot",
    "Perplexity-User",
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "Google-Extended",
    // gates Gemini and AI Overviews grounding
    "DuckAssistBot",
    "MistralAI-User",
    "Amazonbot",
    "Applebot",
    "YouBot"
  ],
  training: [
    "GPTBot",
    "Google-CloudVertexBot",
    "Applebot-Extended",
    "meta-externalagent",
    "FacebookBot",
    "CCBot",
    "Bytespider",
    "cohere-ai",
    "Diffbot",
    "Timpibot",
    "omgili",
    "anthropic-ai",
    // retired, still seen in robots.txt
    "Claude-Web"
    // retired, still seen in robots.txt
  ]
};
export const AI_BOTS = [
  ...AI_BOTS_BY_PURPOSE.citation,
  ...AI_BOTS_BY_PURPOSE.training
];
export const CITATION_BOTS = AI_BOTS_BY_PURPOSE.citation;
export function getBaseUrl9(url: string) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    return url;
  }
}
export function findBlockedAiBots(content: string) {
  const lines = content.split("\n").map((l) => l.trim());
  const blocked = [];
  const sections = /* @__PURE__ */ new Map();
  const currentAgents: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      continue;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      continue;
    }
    const directive = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();
    if (directive === "user-agent") {
      currentAgents.push(value);
    } else if (directive === "disallow") {
      for (const agent of currentAgents) {
        const existing = sections.get(agent) || [];
        existing.push(value);
        sections.set(agent, existing);
      }
    } else {
    }
  }
  const groups: { agents: string[]; disallows: string[] }[] = [];
  let group: { agents: string[]; disallows: string[] } = { agents: [], disallows: [] };
  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      if (group.agents.length > 0) {
        groups.push(group);
        group = { agents: [], disallows: [] };
      }
      continue;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const directive = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();
    if (directive === "user-agent") {
      if (group.disallows.length > 0) {
        groups.push(group);
        group = { agents: [], disallows: [] };
      }
      group.agents.push(value);
    } else if (directive === "disallow") {
      group.disallows.push(value);
    }
  }
  if (group.agents.length > 0) {
    groups.push(group);
  }
  for (const bot of AI_BOTS) {
    const botLower = bot.toLowerCase();
    let isBlocked = false;
    for (const g of groups) {
      const applies = g.agents.some(
        (agent) => agent === "*" || agent.toLowerCase() === botLower
      );
      if (applies && g.disallows.includes("/")) {
        isBlocked = true;
        break;
      }
    }
    if (isBlocked) {
      blocked.push(bot);
    }
  }
  return blocked;
}
export const aiBotAccessRule = defineRule({
  id: "geo-ai-bot-access",
  name: "AI Bot Access",
  description: "Checks whether robots.txt blocks AI answer engines (OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended). Training-only crawlers such as GPTBot are reported but not penalised.",
  category: "geo",
  weight: 20,
  run: async (context) => {
    const baseUrl = getBaseUrl9(context.url);
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    let robotsContent = null;
    try {
      const result = await fetchPage(robotsTxtUrl);
      if (result.statusCode === 200) {
        robotsContent = result.html;
      }
    } catch {
    }
    if (robotsContent === null) {
      return pass(
        "geo-ai-bot-access",
        "No robots.txt found or not accessible - AI bots are not blocked",
        {
          robotsTxtUrl,
          robotsTxtAccessible: false,
          blockedBots: [],
          totalBotsChecked: AI_BOTS.length
        }
      );
    }
    const blockedBots = findBlockedAiBots(robotsContent);
    const allowedBots = AI_BOTS.filter((bot) => !blockedBots.includes(bot));
    const blockedCitationBots = blockedBots.filter((bot) => CITATION_BOTS.includes(bot));
    const blockedTrainingBots2 = blockedBots.filter((bot) => !CITATION_BOTS.includes(bot));
    const details = {
      robotsTxtUrl,
      robotsTxtAccessible: true,
      blockedBots,
      allowedBots,
      blockedCitationBots,
      blockedTrainingBots: blockedTrainingBots2,
      totalBotsChecked: AI_BOTS.length,
      citationBotsChecked: CITATION_BOTS.length,
      blockedCount: blockedBots.length
    };
    if (blockedBots.length === 0) {
      return pass("geo-ai-bot-access", "AI bots are not blocked in robots.txt", details);
    }
    if (blockedCitationBots.length >= CITATION_BOTS.length) {
      return fail(
        "geo-ai-bot-access",
        `All ${CITATION_BOTS.length} AI answer engines are blocked in robots.txt - this site cannot be cited in AI-generated answers`,
        {
          ...details,
          recommendation: "Allow the answer-engine crawlers (OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended) to appear in AI answers. Training crawlers such as GPTBot can stay blocked if that is your policy."
        }
      );
    }
    if (blockedCitationBots.length > 0) {
      return warn(
        "geo-ai-bot-access",
        `${blockedCitationBots.length} AI answer engine(s) blocked in robots.txt: ${blockedCitationBots.join(", ")}`,
        {
          ...details,
          recommendation: "These crawlers fetch pages to answer user questions and can cite you. Blocking them removes this site from those answers."
        }
      );
    }
    return pass(
      "geo-ai-bot-access",
      `Answer-engine crawlers are allowed; ${blockedTrainingBots2.length} training-only crawler(s) blocked: ${blockedTrainingBots2.join(", ")}`,
      {
        ...details,
        note: "Blocking training-only crawlers does not affect visibility in AI answers."
      }
    );
  }
});

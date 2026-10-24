export type RobotsRule = { allow: boolean; pattern: string; regex: RegExp };
export type RobotsGroup = { agents: string[]; rules: RobotsRule[] };

export function patternToRegex2(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`);
}

export function parseRobotsTxt(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let acceptingAgents = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const field = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    if (field === "user-agent") {
      if (!current || !acceptingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
        acceptingAgents = true;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (field !== "allow" && field !== "disallow") continue;
    if (!current) continue;
    acceptingAgents = false;
    if (field === "disallow" && value === "") continue;
    if (value === "") continue;
    current.rules.push({
      allow: field === "allow",
      pattern: value,
      regex: patternToRegex2(value),
    });
  }
  return groups;
}

export class RobotsMatcher {
  rules: RobotsRule[];
  /**
   * @param content - The robots.txt body, or empty when the site has none
   * @param userAgent - The crawler's user-agent string
   */
  constructor(content: string, userAgent: string) {
    this.rules = RobotsMatcher.selectGroup(parseRobotsTxt(content), userAgent);
  }
  /**
   * Pick the group that governs this crawler.
   *
   * A group naming the agent wins over the `*` group, and among named groups
   * the longest token wins, so "seomator-bot" beats a bare "seomator".
   */
  static selectGroup(groups: RobotsGroup[], userAgent: string): RobotsRule[] {
    const ua = userAgent.toLowerCase();
    let best: RobotsGroup | null = null;
    let bestLength = -1;
    for (const group of groups) {
      for (const agent of group.agents) {
        if (agent === "*") {
          if (bestLength < 0) {
            best = group;
            bestLength = 0;
          }
          continue;
        }
        if (ua.includes(agent) && agent.length > bestLength) {
          best = group;
          bestLength = agent.length;
        }
      }
    }
    return best?.rules ?? [];
  }
  /** Whether the crawler is permitted to fetch this URL. */
  isAllowed(url: string): boolean {
    return this.explain(url).allowed;
  }
  /**
   * The decision for a URL, and the pattern of the rule that made it.
   *
   * The longest matching pattern decides; when an Allow and a Disallow match
   * with equal length, Allow wins, which is what the spec requires.
   */
  explain(url: string): { allowed: boolean; pattern: string | null } {
    if (this.rules.length === 0) return { allowed: true, pattern: null };
    let path: string;
    try {
      const parsed = new URL(url);
      path = parsed.pathname + parsed.search;
    } catch {
      return { allowed: true, pattern: null };
    }
    let decision = true;
    let decidedBy = -1;
    let pattern: string | null = null;
    for (const rule of this.rules) {
      if (!rule.regex.test(path)) continue;
      const specificity = rule.pattern.length;
      if (specificity > decidedBy || (specificity === decidedBy && rule.allow)) {
        decision = rule.allow;
        decidedBy = specificity;
        pattern = rule.pattern;
      }
    }
    return { allowed: decision, pattern: decision ? null : pattern };
  }
}

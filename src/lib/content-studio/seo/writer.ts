import { contentProviders, execute } from "../ai";
import type { Outline } from "./outline";
export type { StyleProfile } from "../types";
import type { StyleProfile } from "../types";


// This is the last line of defence when every AI provider fails, so it must
// tolerate a partial outline (e.g. the stub /api/calendar writes) rather than
// throwing — a crash here surfaces as a 500 with an empty body.
function fallbackPost(outline: Outline, kw: string): string {
  const arr = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
  const lines: string[] = [];
  lines.push(`# ${outline.title ?? kw}`, "");

  const bullets = arr(outline.tldr_bullets);
  if (bullets.length > 0) {
    lines.push("## TL;DR", "");
    for (const b of bullets) lines.push(`- ${b}`);
    lines.push("");
  }

  lines.push(outline.intro_hook ?? `${kw} matters more than most guides admit.`, "");

  for (const h2 of arr(outline.h2s)) {
    if (!h2?.heading) continue;
    lines.push(`## ${h2.heading}`, "");
    if (h2.snippet_target) {
      lines.push(`${kw} is a key approach that lets you achieve a specific outcome. The short answer: it works when you follow the playbook below.`, "");
    } else {
      lines.push(`This section covers ${h2.heading.toLowerCase()} in practical terms. ${h2.notes ?? ""}`.trim(), "");
    }
    for (const h3 of arr(h2.h3s)) {
      lines.push(`### ${h3}`, "");
      lines.push(`Detail for ${String(h3).toLowerCase()}. [CITE: source needed]`, "");
    }
  }

  const faqs = arr(outline.faqs);
  if (faqs.length > 0) {
    lines.push("## Frequently asked questions", "");
    for (const f of faqs) {
      if (!f?.q) continue;
      lines.push(`### ${f.q}`, "", `Direct answer in 40-55 words covering ${kw}. [CITE: source needed]`, "");
    }
  }

  lines.push("## Conclusion", "", outline.conclusion_cta ?? `Put ${kw} into practice with the steps above.`);
  return lines.join("\n");
}

export async function writePost(input: {
  outline: Outline;
  primary_keyword: string;
  style: StyleProfile;
  language: string;
}): Promise<string> {
  const providers = await contentProviders();
  if (providers.length === 0) return fallbackPost(input.outline, input.primary_keyword);

  try {
    const resp = await execute({
      methodologies: [
        "post-writer-style-matching",
        "eeat-checklist",
        "readability-targets",
        "featured-snippet-targeting",
        "paa-optimization",
        "skyscraper-technique"
      ],
      task: "Write the full post in Markdown following the outline exactly.",
      input,
      providers,
      jsonMode: false,
      temperature: 0.7,
      maxTokens: 6000,
      feature: "blog_draft"
    });
    return resp.text.trim();
  } catch {
    return fallbackPost(input.outline, input.primary_keyword);
  }
}

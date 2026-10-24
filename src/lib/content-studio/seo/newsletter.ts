import { contentProviders, execute } from "../ai";
import { parseJsonResponse } from "../json";
import { newsletterSchema } from "./schemas";
export type { NewsletterPack } from "../types";
import type { NewsletterPack } from "../types";


function fallback(title: string, keyword: string, url: string): NewsletterPack {
  return {
    short: `New: ${title}. The ${keyword} approach most guides skip. Read it → ${url}`.slice(0, 240),
    long: [
      `Most guides on ${keyword} skip the part that matters.`,
      "",
      `I rebuilt my approach after seeing it fail on a real project, then dug into what actually works for the top results in 2026.`,
      "",
      `In the new post you'll find:`,
      `- The single change that fixed our ranking trajectory`,
      `- A repeatable workflow you can run this week`,
      `- The exact pattern the top 3 results share`,
      "",
      `Full read here: ${url}`,
      "",
      `— Team`
    ].join("\n")
  };
}

export async function generateNewsletter(input: {
  title: string;
  primary_keyword: string;
  intro: string;
  url: string;
  /** Language the output should be written in (ISO code, e.g. "fr"). */
  language?: string;
}): Promise<NewsletterPack> {
  const providers = await contentProviders();
  if (providers.length === 0) return fallback(input.title, input.primary_keyword, input.url);
  try {
    const resp = await execute({
      methodologies: ["newsletter-excerpt"],
      task: "Produce short and long newsletter excerpts.",
      input,
      providers,
      jsonMode: true,
      jsonSchema: newsletterSchema,
      temperature: 0.6
    });
    const parsed = parseJsonResponse<NewsletterPack>(resp.text);
    if (!parsed?.short || !parsed.long) return fallback(input.title, input.primary_keyword, input.url);
    return parsed;
  } catch {
    return fallback(input.title, input.primary_keyword, input.url);
  }
}

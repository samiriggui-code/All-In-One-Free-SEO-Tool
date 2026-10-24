"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import {
  suggestAutoLinks,
  type AutoLinkSuggestion,
} from "@/lib/content-ai-helpers";
import { saveToolRun } from "@/lib/tool-runs";

export type AutoLinkState =
  | { ok: true; suggestions: AutoLinkSuggestion[] }
  | { ok: false; error: string };

function parsePages(raw: string): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split(/\t+|\s{2,}/);
    if (parts.length >= 2) {
      out.push({ url: parts[0].trim(), title: parts.slice(1).join(" ").trim() });
    } else {
      // URL only — title falls back to the URL path
      try {
        const u = new URL(parts[0]);
        out.push({ url: parts[0].trim(), title: u.pathname.replace(/^\//, "") || u.hostname });
      } catch {
        // skip
      }
    }
  }
  return out.slice(0, 100);
}

export async function runAutoLink(
  _prev: AutoLinkState | null,
  formData: FormData,
): Promise<AutoLinkState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.auto-link");
  const content = String(formData.get("content") ?? "").trim();
  const pagesRaw = String(formData.get("pages") ?? "").trim();
  if (!content) return { ok: false, error: t("errNoContent") };
  if (!pagesRaw) return { ok: false, error: t("errNoPages") };
  const pages = parsePages(pagesRaw);
  if (pages.length === 0) return { ok: false, error: t("errNoValidPages") };
  const r = await suggestAutoLinks({ content, internalPages: pages });
  if (!r.ok) return { ok: false, error: r.error };
  await saveToolRun({
    toolId: "auto-link",
    label: t("runLabel", {
      suggestions: r.suggestions.length,
      pages: pages.length,
    }),
    input: { contentLen: content.length, pageCount: pages.length },
    result: { ok: true, suggestions: r.suggestions },
  }).catch(() => undefined);
  return { ok: true, suggestions: r.suggestions };
}

"use client";

import { useActionState } from "react";
import { ArrowRight, ExternalLink, Link2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { recommendLinks, type RecommendState } from "./actions";

export function RecommenderForm() {
  const t = useTranslations("tools.ui.link-recommender");
  const [state, formAction, pending] = useActionState<
    RecommendState | null,
    FormData
  >(recommendLinks, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("siteUrl")}</span>
            <input
              name="siteUrl"
              required
              placeholder="https://yoursite.com"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">
              {t("skipUrl")}
            </span>
            <input
              name="excludeUrl"
              placeholder="https://yoursite.com/new-post"
              className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>
        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">
            {t("draft")}
          </span>
          <textarea
            name="draft"
            required
            rows={12}
            placeholder={t("draftPlaceholder")}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-violet-500/15 px-5 text-sm font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("running")}
            </>
          ) : (
            <>
              <Link2 className="mr-2 size-4" />
              {t("submit")}
            </>
          )}
        </button>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <section className="glass-apple relative overflow-hidden rounded-2xl">
          <header className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-base font-semibold">
              {t("suggestions", { count: state.result.suggestions.length })}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("pickedFrom", { count: state.result.candidateCount })}
            </p>
          </header>
          {state.result.error && (
            <p className="border-b border-white/[0.05] bg-amber-500/10 px-5 py-3 text-xs text-amber-300">
              {state.result.error}
            </p>
          )}
          {state.result.suggestions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              {t("noSuggestions")}
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {state.result.suggestions.map((s, i) => (
                <li key={i} className="px-5 py-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-mono text-violet-200 ring-1 ring-inset ring-violet-500/30">
                          {s.anchorText}
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <a
                          href={s.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 truncate text-xs hover:underline"
                        >
                          {s.targetUrl.replace(/^https?:\/\/[^/]+/, "")}
                          <ExternalLink className="size-3 opacity-60" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.rich("insertNear", {
                          snippet: s.contextSnippet,
                          em: (chunks) => (
                            <em className="text-foreground/80">{chunks}</em>
                          ),
                        })}
                      </p>
                      {s.rationale && (
                        <p className="text-[11px] text-muted-foreground">
                          {s.rationale}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

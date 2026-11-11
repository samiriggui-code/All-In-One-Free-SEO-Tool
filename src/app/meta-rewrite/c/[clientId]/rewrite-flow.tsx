"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import {
  applyRewrite,
  findCandidates,
  type ApplyState,
  type FindState,
} from "../../actions";
import { AiFeedback } from "@/components/ai-feedback";
import { AiDisclaimer } from "@/components/ai-disclaimer";

export function RewriteFlow({
  clientId,
  wpConnected,
}: {
  clientId: number;
  wpConnected: boolean;
}) {
  const [findState, findAction, finding] = useActionState<
    FindState | null,
    FormData
  >(findCandidates, null);
  const t = useTranslations("keywordsTab.metaRewrite.flow");

  return (
    <>
      <form action={findAction}>
        <input type="hidden" name="clientId" value={clientId} />
        <button
          type="submit"
          disabled={finding}
          className="inline-flex h-10 items-center rounded-md bg-violet-500/15 px-5 text-sm font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {finding ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("finding")}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              {t("find")}
            </>
          )}
        </button>
      </form>

      {findState && !findState.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {findState.error}
        </p>
      )}

      {findState?.ok && (
        <>
          {findState.result.error && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/30">
              {findState.result.error}
            </p>
          )}

          {!wpConnected && findState.result.candidates.length > 0 && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/30">
              {t.rich("wpNotConnected", {
                link: (c) => (
                  <a
                    href={`/clients/${clientId}#wp-bridge`}
                    className="underline"
                  >
                    {c}
                  </a>
                ),
              })}
            </p>
          )}

          <div className="space-y-4">
            {findState.result.candidates.map((c) => (
              <CandidateCard
                key={c.url}
                clientId={clientId}
                wpConnected={wpConnected}
                candidate={c}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CandidateCard({
  clientId,
  wpConnected,
  candidate,
}: {
  clientId: number;
  wpConnected: boolean;
  candidate: {
    url: string;
    currentTitle: string;
    currentMeta: string;
    clicks: number;
    impressions: number;
    ctrPct: number;
    position: number;
    topQueries: string[];
    suggestions: { title: string; meta: string; rationale: string }[];
  };
}) {
  const [pickedIdx, setPickedIdx] = useState(0);
  const picked = candidate.suggestions[pickedIdx];

  const [applyState, applyAction, applying] = useActionState<
    ApplyState | null,
    FormData
  >(applyRewrite, null);
  const t = useTranslations("keywordsTab.metaRewrite.flow");

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <a
          href={candidate.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 truncate text-sm font-medium hover:underline"
        >
          {candidate.url.replace(/^https?:\/\/[^/]+/, "")}
          <ExternalLink className="size-3 opacity-60" />
        </a>
        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span>{t("stats.position", { value: candidate.position })}</span>
          <span>· {t("stats.impressions", { count: candidate.impressions })}</span>
          <span>· {t("stats.clicks", { count: candidate.clicks })}</span>
          <span>· {t("stats.ctr", { value: candidate.ctrPct.toFixed(2) })}</span>
        </div>
      </header>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        <div className="rounded-md bg-rose-500/5 ring-1 ring-rose-500/15 px-3 py-2.5 text-xs">
          <div className="text-[10px] font-medium uppercase tracking-wider text-rose-300/90">
            {t("current")}
          </div>
          <p className="mt-1 font-medium text-foreground/90">
            {candidate.currentTitle || t("noTitle")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {candidate.currentMeta || t("noMeta")}
          </p>
        </div>
        {candidate.suggestions.length > 0 && picked ? (
          <div className="rounded-md bg-emerald-500/5 ring-1 ring-emerald-500/20 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-300/90">
                {t("suggested", { index: pickedIdx + 1, total: candidate.suggestions.length })}
              </div>
              <div className="flex gap-1">
                {candidate.suggestions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPickedIdx(i)}
                    className={`size-5 rounded text-[10px] ${
                      i === pickedIdx
                        ? "bg-emerald-500/30 text-emerald-200"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 font-medium text-foreground/95">
              {picked.title}
            </p>
            <p className="mt-1 text-muted-foreground">{picked.meta}</p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/80">
              {picked.rationale}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <AiFeedback
                feature="meta_rewrite"
                aiOutput={`${picked.title}\n\n${picked.meta}`}
                clientId={clientId}
                size="sm"
              />
            </div>
            <AiDisclaimer variant="inline" />
          </div>
        ) : (
          <p className="rounded-md bg-white/5 px-3 py-2.5 text-xs text-muted-foreground">
            {t("noSuggestion")}
          </p>
        )}
      </div>

      {candidate.topQueries.length > 0 && (
        <div className="border-t border-white/[0.05] px-5 py-2.5 text-[10px] text-muted-foreground">
          {t("topQueries")}{" "}
          {candidate.topQueries.slice(0, 5).map((q, i) => (
            <span key={q}>
              <code className="rounded bg-white/5 px-1.5 py-0.5">{q}</code>
              {i < Math.min(4, candidate.topQueries.length - 1) && " · "}
            </span>
          ))}
        </div>
      )}

      {picked && wpConnected && (
        <form action={applyAction} className="border-t border-white/[0.05] px-5 py-3">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="url" value={candidate.url} />
          <input type="hidden" name="title" value={picked.title} />
          <input type="hidden" name="meta" value={picked.meta} />
          <button
            type="submit"
            disabled={applying || applyState?.ok}
            className="inline-flex h-9 items-center rounded-md bg-emerald-500/15 px-4 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {applyState?.ok ? (
              <>
                <CheckCircle2 className="mr-2 size-3.5" />
                {applyState.postId ? t("pushedPost", { id: applyState.postId }) : t("pushed")}
              </>
            ) : applying ? (
              <>
                <Loader2 className="mr-2 size-3 animate-spin" />
                {t("pushing")}
              </>
            ) : (
              <>
                <Send className="mr-2 size-3" />
                {t("push")}
              </>
            )}
          </button>
          {applyState && !applyState.ok && (
            <p className="mt-1 text-[11px] text-rose-300">{applyState.error}</p>
          )}
        </form>
      )}
    </section>
  );
}

"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  Loader2,
  Video,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { runYtAudit, type YtAuditState } from "./actions";
import { AiDisclaimer } from "@/components/ai-disclaimer";

const SEV_TONE: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
};

const CAT_TONE: Record<string, string> = {
  title: "bg-violet-500/10 text-violet-300",
  description: "bg-cyan-500/10 text-cyan-300",
  discoverability: "bg-amber-500/10 text-amber-300",
  engagement: "bg-emerald-500/10 text-emerald-300",
  freshness: "bg-rose-500/10 text-rose-300",
  thumbnail: "bg-violet-500/10 text-violet-300",
  metadata: "bg-cyan-500/10 text-cyan-300",
};

export function YtAuditForm() {
  const t = useTranslations("tools.ui.youtube-audit");
  const [state, formAction, pending] = useActionState<
    YtAuditState | null,
    FormData
  >(runYtAudit, null);

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="url"
            required
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <input
            name="targetKeyword"
            placeholder={t("keywordPlaceholder")}
            className="h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-rose-500/15 px-5 text-sm font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("auditing")}
            </>
          ) : (
            <>
              <Video className="mr-2 size-4" />
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

      {state?.ok && state.result.meta && (
        <>
          {/* Header card */}
          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <div className="grid gap-4 p-5 md:grid-cols-[200px_1fr]">
              {state.result.meta.thumbnailUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={state.result.meta.thumbnailUrl}
                  alt={state.result.meta.title ?? ""}
                  className="aspect-video w-full rounded-lg object-cover ring-1 ring-inset ring-white/5"
                />
              ) : (
                <div className="aspect-video w-full rounded-lg bg-neutral-800" />
              )}
              <div className="space-y-1">
                <a
                  href={state.result.meta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-base font-semibold hover:underline"
                >
                  {state.result.meta.title ?? t("noTitle")}
                  <ExternalLink className="size-3 opacity-60" />
                </a>
                <p className="text-xs text-muted-foreground">
                  {state.result.meta.channel ?? t("unknownChannel")}
                </p>
                <div className="flex flex-wrap gap-2 pt-2 text-[10px] text-muted-foreground">
                  {state.result.meta.viewCount !== null && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {t("views", { count: state.result.meta.viewCount })}
                    </span>
                  )}
                  {state.result.meta.likeCount !== null && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {t("likes", { count: state.result.meta.likeCount })}
                    </span>
                  )}
                  {state.result.meta.publishedAt && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {t("published", {
                        date: state.result.meta.publishedAt.slice(0, 10),
                      })}
                    </span>
                  )}
                  {state.result.meta.durationSeconds && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {t("duration", {
                        min: Math.floor(state.result.meta.durationSeconds / 60),
                        sec: state.result.meta.durationSeconds % 60,
                      })}
                    </span>
                  )}
                  {state.result.meta.tags.length > 0 && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {t("tags", { count: state.result.meta.tags.length })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Score */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label={t("passing")}
              value={`${state.result.passing}/${state.result.passing + state.result.failing}`}
              tone="emerald"
            />
            <Stat
              label={t("failing")}
              value={state.result.failing.toString()}
              tone={state.result.failing > 0 ? "rose" : "emerald"}
            />
            <Stat
              label={t("score")}
              value={`${Math.round((state.result.passing / Math.max(1, state.result.passing + state.result.failing)) * 100)}%`}
              tone={
                state.result.failing === 0
                  ? "emerald"
                  : state.result.failing < 3
                    ? "amber"
                    : "rose"
              }
            />
          </div>

          {/* Checklist */}
          <section className="glass-apple relative overflow-hidden rounded-2xl">
            <header className="border-b border-white/[0.06] px-5 py-3">
              <h3 className="text-sm font-semibold">{t("checklist")}</h3>
            </header>
            <ul className="divide-y divide-white/[0.05]">
              {state.result.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-5 py-2.5 text-xs">
                  {c.pass ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose-300" />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={c.pass ? "" : "font-medium"}>
                        {c.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ${CAT_TONE[c.category] ?? "bg-white/5"}`}
                      >
                        {t.has(`categories.${c.category}`)
                          ? t(`categories.${c.category}`)
                          : c.category}
                      </span>
                      {!c.pass && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ring-1 ring-inset ${SEV_TONE[c.severity]}`}
                        >
                          {t.has(`severity.${c.severity}`)
                            ? t(`severity.${c.severity}`)
                            : c.severity}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground">{c.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* AI fix steps */}
          {state.result.fixSteps && (
            <section className="glass-apple relative overflow-hidden rounded-2xl space-y-3 p-5">
              <h3 className="text-sm font-semibold">{t("fixSteps")}</h3>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {state.result.fixSteps}
              </pre>
              <AiDisclaimer />
            </section>
          )}
        </>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const t = tone
    ? { emerald: "text-emerald-300", amber: "text-amber-300", rose: "text-rose-300" }[tone]
    : "";
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${t}`}>{value}</div>
    </div>
  );
}

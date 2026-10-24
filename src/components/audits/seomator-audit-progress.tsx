"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SeomatorAuditProgress } from "@/lib/seomator-audit-progress";

type ProgressPayload = {
  status: string;
  pagesCrawled: number | null;
  score: number | null;
  previewScreenshotPath: string | null;
  progress: SeomatorAuditProgress | null;
};

function scoreTone(score: number | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 90) return "text-emerald-300";
  if (score >= 70) return "text-amber-300";
  return "text-rose-300";
}

export function SeomatorAuditProgressLive({
  auditId,
  targetUrl,
  initialPagesCrawled,
  showPreview = true,
}: {
  auditId: number;
  targetUrl: string;
  initialPagesCrawled: number | null;
  /** False for a quick audit, which renders nothing to capture. */
  showPreview?: boolean;
}) {
  const t = useTranslations("auditUi.progress");
  const tCat = useTranslations("auditUi.categories");
  const [data, setData] = useState<ProgressPayload | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/audits/${auditId}/progress`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as ProgressPayload;
        if (cancelled) return;
        setData(json);
        if (json.previewScreenshotPath) setPreviewReady(true);
        if (json.status === "completed" || json.status === "failed") {
          window.location.reload();
        }
      } catch {
        /* ignore transient network errors */
      }
    };

    void poll();
    const id = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [auditId]);

  const progress = data?.progress;
  const pages = data?.pagesCrawled ?? initialPagesCrawled ?? progress?.pagesCrawled ?? 0;
  const currentRule = progress?.currentRuleName;
  const currentCat = progress?.categories.find(
    (c) => c.id === progress.currentCategoryId,
  );

  return (
    <div className="space-y-6">
      <div className={showPreview ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]" : "grid gap-6"}>
        {showPreview ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {previewReady ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/audits/${auditId}/preview?t=${encodeURIComponent(progress?.updatedAt ?? "")}`}
                alt={t("previewAlt", { url: targetUrl })}
                className="aspect-[16/10] w-full object-cover object-top"
              />
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 to-slate-950 px-6 text-center">
                <Loader2 className="size-8 animate-spin text-sky-300" />
                <p className="text-sm text-muted-foreground">
                  {t("capturing")}
                </p>
                <p className="text-xs text-muted-foreground">{targetUrl}</p>
              </div>
            )}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("crawl")}
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {pages}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {t("pagesUnit", { count: pages })}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {progress?.phase === "categories"
              ? t("phaseCategories")
              : t("phaseCrawl")}
          </p>
          {currentCat || currentRule ? (
            <p className="mt-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-100">
              {currentCat ? (
                <>
                  <span className="font-medium">
                    {tCat.has(currentCat.id) ? tCat(currentCat.id) : currentCat.name}
                  </span>
                  {currentRule ? (
                    <>
                      {" "}
                      · <span className="text-muted-foreground">{currentRule}</span>
                    </>
                  ) : null}
                </>
              ) : (
                currentRule
              )}
            </p>
          ) : null}
        </div>
      </div>

      {progress?.categories?.length ? (
        <div className="rounded-2xl border border-white/5 bg-card/40 px-5 py-4 backdrop-blur-md">
          <h3 className="text-sm font-semibold tracking-tight">
            {t("categoryProgress")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("categoryProgressHint")}
          </p>
          <ul className="mt-4 space-y-2">
            {progress.categories.map((cat) => {
              const icon =
                cat.status === "complete" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                ) : cat.status === "running" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-sky-300" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/50" />
                );
              return (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {icon}
                    <span
                      className={
                        cat.status === "running"
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {tCat.has(cat.id) ? tCat(cat.id) : cat.name}
                    </span>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums">
                    {cat.status === "complete" && cat.score != null ? (
                      <>
                        <span className={`font-semibold ${scoreTone(cat.score)}`}>
                          {cat.score}
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {t("catCounts", {
                            pass: cat.passCount ?? 0,
                            warn: cat.warnCount ?? 0,
                            fail: cat.failCount ?? 0,
                          })}
                        </span>
                      </>
                    ) : cat.status === "running" ? (
                      <span className="text-sky-300">{t("running")}</span>
                    ) : (
                      <span className="text-muted-foreground">{t("pending")}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

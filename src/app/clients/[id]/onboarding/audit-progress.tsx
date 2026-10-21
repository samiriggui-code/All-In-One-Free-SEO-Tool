"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAuditProgress, type AuditProgress } from "./actions";

/**
 * Live state of the site crawl that starts the moment a client is added.
 */
export function AuditProgressBar({ clientId }: { clientId: number }) {
  const t = useTranslations("onboarding.audit");
  const [p, setP] = useState<AuditProgress | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const next = await getAuditProgress(clientId);
        if (!alive) return;
        setP(next);
        if (next.status === "running" || next.status === "queued") {
          timer = setTimeout(tick, 2000);
        }
      } catch {
        if (alive) timer = setTimeout(tick, 5000);
      }
    }
    void tick();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [clientId]);

  if (!p || p.status === "none") return null;

  const running = p.status === "running" || p.status === "queued";
  const pct = running
    ? Math.min(95, Math.round((p.pagesCrawled / p.maxPages) * 100))
    : 100;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-sm">
        {running && <Loader2 className="size-4 animate-spin text-violet-300" />}
        {p.status === "completed" && (
          <CheckCircle2 className="size-4 text-emerald-400" />
        )}
        {p.status === "failed" && (
          <TriangleAlert className="size-4 text-amber-400" />
        )}
        <span className="font-medium">
          {running && t("checking")}
          {p.status === "completed" && t("done")}
          {p.status === "failed" && t("failed")}
        </span>
        {running && p.pagesCrawled > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("pagesSoFar", { count: p.pagesCrawled })}
          </span>
        )}
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            p.status === "failed"
              ? "bg-amber-400/60"
              : p.status === "completed"
                ? "bg-emerald-400/70"
                : "bg-violet-400/70"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {running && t("runningHint")}
        {p.status === "completed" &&
          (p.score !== null
            ? t("completedHintScore", {
                issues: p.issuesCount,
                score: p.score,
              })
            : t("completedHint", { issues: p.issuesCount }))}
        {p.status === "failed" && t("failedHint")}
      </p>
    </div>
  );
}

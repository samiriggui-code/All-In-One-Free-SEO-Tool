"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import {
  PLATFORM_TACTICS,
  priorityForNiche,
  type PlatformTactics,
} from "@/lib/ai-citation-tactics";

const NICHE_LABELS = [
  { id: null, label: "universal" },
  { id: "saas", label: "saas" },
  { id: "local", label: "local" },
  { id: "ecommerce", label: "ecommerce" },
  { id: "blog", label: "blog" },
  { id: "services", label: "services" },
] as const;

const EFFORT_TONE = {
  low: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  high: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export default function AiCitationTacticsPage() {
  const t = useTranslations("tools.ui.ai-citation-tactics");
  const tCommon = useTranslations("tools.common");
  const [niche, setNiche] = useState<string | null>(null);
  const nicheLabel = NICHE_LABELS.find((n) => n.id === niche)?.label;
  const priorities = priorityForNiche(niche);
  const priorityIds = new Set(priorities.map((p) => p.platform));

  // Sort platforms with priorities first
  const sorted: PlatformTactics[] = [
    ...PLATFORM_TACTICS.filter((p) => priorityIds.has(p.platform)),
    ...PLATFORM_TACTICS.filter((p) => !priorityIds.has(p.platform)),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {tCommon("allTools")}
      </Link>

      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Sparkles}
        accent="violet"
      />

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <p className="text-xs text-muted-foreground">{t("tuneForNiche")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {NICHE_LABELS.map((n) => (
            <button
              key={n.label}
              type="button"
              onClick={() => setNiche(n.id)}
              className={`rounded-full px-3 py-1 text-xs ring-1 ring-inset transition-colors ${
                niche === n.id
                  ? "bg-violet-500/15 text-violet-300 ring-violet-500/30"
                  : "bg-white/5 text-muted-foreground ring-white/10 hover:bg-white/10"
              }`}
            >
              {t(`niches.${n.label}`)}
            </button>
          ))}
        </div>
        {priorities.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("priorityOrderFor", {
                niche: nicheLabel ? t(`niches.${nicheLabel}`) : t("yourNiche"),
              })}
            </p>
            {priorities.map((p, i) => (
              <p key={p.platform} className="text-xs">
                <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-300">
                  {i + 1}
                </span>
                <strong className="text-violet-200">{p.platform}</strong>{" "}
                <span className="text-muted-foreground">— {p.reason}</span>
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-4">
        {sorted.map((p) => {
          const isPriority = priorityIds.has(p.platform);
          return (
            <section
              key={p.platform}
              className={`relative overflow-hidden rounded-2xl border p-5 ${
                isPriority
                  ? "border-violet-500/30 bg-violet-500/[0.04]"
                  : "border-white/5 bg-card/40"
              }`}
            >
              <header className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold">
                  {p.platform}
                  {isPriority && (
                    <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-inset ring-violet-500/30">
                      {t("priorityBadge", {
                        rank: priorities.findIndex((x) => x.platform === p.platform) + 1,
                      })}
                    </span>
                  )}
                </h2>
              </header>
              <p className="mt-1 text-xs text-muted-foreground">{p.audienceShare}</p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                <strong className="text-foreground/80">{t("citationBias")}</strong>{" "}
                {p.citationBias}
              </p>
              <ul className="mt-4 space-y-2">
                {p.tactics.map((tactic) => (
                  <li
                    key={tactic.id}
                    className="rounded-md border border-white/5 bg-black/20 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{tactic.title}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider ring-1 ring-inset ${EFFORT_TONE[tactic.effort]}`}
                      >
                        {t(`effort.${tactic.effort}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{tactic.detail}</p>
                  </li>
                ))}
              </ul>
              {/* Inline upsells */}
              {p.platform === "Google AI Overviews" && (
                <div className="mt-3 rounded-md bg-violet-500/10 px-3 py-2 text-[11px] ring-1 ring-inset ring-violet-500/30">
                  <Link
                    href="/tools/aio-passage"
                    className="text-violet-200 hover:underline"
                  >
                    {t("upsellAio")}
                  </Link>
                </div>
              )}
              {p.platform === "Gemini / AI Mode" && (
                <div className="mt-3 rounded-md bg-violet-500/10 px-3 py-2 text-[11px] ring-1 ring-inset ring-violet-500/30">
                  <Link
                    href="/tools/person-schema"
                    className="text-violet-200 hover:underline"
                  >
                    {t("upsellPersonSchema")}
                  </Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

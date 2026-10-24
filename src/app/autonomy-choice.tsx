"use client";

import { useState, useTransition } from "react";
import { Bot, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AutonomyLevel } from "@/lib/agent/autonomy-levels";
import { chooseAutonomyAction } from "./autonomy-actions";

/**
 * Three options, in the order a person should consider them, with the
 * consequence of each stated rather than implied.
 *
 * "Off" is not offered here. Someone who wants the agent not to run at
 * all is choosing something different from the question being asked, and
 * the setting is one click away in agent settings. Offering four options
 * to answer "how much may it do" made the choice harder without making
 * it better.
 */
const OPTIONS: AutonomyLevel[] = ["suggest", "apply_safe", "apply_all"];

export function AutonomyChoice({ current }: { current: AutonomyLevel }) {
  const [picked, setPicked] = useState<AutonomyLevel | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const t = useTranslations("dashboard.autonomy");

  const choose = (level: AutonomyLevel) => {
    setPicked(level);
    setError(null);
    start(async () => {
      const r = await chooseAutonomyAction(level);
      if (!r.ok) {
        setError(r.error);
        setPicked(null);
        return;
      }
      setDone(true);
    });
  };

  if (done) return null;

  return (
    <section className="glass-apple overflow-hidden rounded-2xl">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <Bot className="mt-0.5 size-4 shrink-0 text-violet-400" />
        <span>
          <h2 className="text-sm font-semibold">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("body")}
          </p>
        </span>
      </header>

      <div className="grid gap-2 p-4 sm:grid-cols-3">
        {OPTIONS.map((level) => (
          <button
            key={level}
            type="button"
            disabled={picked !== null}
            onClick={() => choose(level)}
            className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
              level === current
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-ring/50 hover:bg-accent"
            } disabled:opacity-60`}
            title={t(`levels.${level}.description`)}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-medium">
              {picked === level ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : level === current ? (
                <Check className="size-3.5 text-primary" />
              ) : null}
              {t(`levels.${level}.label`)}
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">
              {t(`levels.${level}.hint`)}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="px-5 pb-4 text-xs text-destructive">{error}</p>
      )}
    </section>
  );
}

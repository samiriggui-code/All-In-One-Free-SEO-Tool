import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { projectJourney, type JourneyFacts } from "@/lib/project-journey";

/**
 * The project's frieze: its seven steps on one line, the one in progress
 * highlighted, and a single button for what to do next. The rules are in
 * lib/project-journey.ts; nothing here can be ticked by hand.
 */
export function ProjectJourney(props: JourneyFacts) {
  const t = useTranslations("clientPage.journey");
  const j = projectJourney(props);
  const doneCount = j.steps.filter((s) => s.done).length;

  return (
    <section
      aria-label={t("aria")}
      className="rounded-2xl border border-border bg-card/50 px-4 py-3 backdrop-blur-md"
    >
      <ol className="flex items-start gap-1 overflow-x-auto pb-1">
        {j.steps.map((s, i) => {
          const current = s.key === j.current;
          return (
            <li
              key={s.key}
              aria-current={current ? "step" : undefined}
              className="flex min-w-[5.5rem] flex-1 flex-col items-center gap-1.5 text-center"
            >
              <span className="flex w-full items-center">
                <span
                  aria-hidden
                  className={`h-px flex-1 ${i === 0 ? "bg-transparent" : "bg-border"}`}
                />
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                    s.done
                      ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                      : current
                        ? "bg-primary/15 text-primary ring-primary/40"
                        : "bg-muted text-muted-foreground ring-border"
                  }`}
                >
                  {s.done ? <Check className="size-3.5" aria-label={t("done")} /> : i + 1}
                </span>
                <span
                  aria-hidden
                  className={`h-px flex-1 ${i === j.steps.length - 1 ? "bg-transparent" : "bg-border"}`}
                />
              </span>
              <span
                className={`text-[11px] leading-tight ${
                  current ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {t(`steps.${s.key}`)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
        <p className="min-w-0 basis-full text-xs text-muted-foreground sm:flex-1 sm:basis-0">
          <span className="mr-2 tabular-nums">{t("progress", { done: doneCount })}</span>
          {j.variant ? t(`next.${j.variant}.status`) : t("allDone")}
        </p>
        {j.href && j.variant ? (
          <Link
            href={j.href}
            {...(j.href.endsWith("/pdf") ? { target: "_blank", rel: "noreferrer" } : {})}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <span className="opacity-80">{t("nextStep")}</span>
            {t(`next.${j.variant}.cta`)}
            <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

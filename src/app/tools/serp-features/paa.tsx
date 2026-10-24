import { useTranslations } from "next-intl";

export function PaaPanel({
  questions,
}: {
  questions: { question: string; firstSeenIn: string; count: number }[];
}) {
  const t = useTranslations("tools.ui.serp-features");
  if (questions.length === 0) return null;
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-3">
        <h3 className="text-sm font-semibold">
          {t("paaTitle", { count: questions.length })}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("paaHint")}
        </p>
      </header>
      <ul className="divide-y divide-white/[0.05]">
        {questions.slice(0, 60).map((q) => (
          <li
            key={q.question}
            className="flex items-center justify-between gap-3 px-5 py-1.5 text-xs"
          >
            <span className="font-medium">{q.question}</span>
            <span className="text-muted-foreground tabular-nums">
              {t("paaMeta", { count: q.count, query: q.firstSeenIn })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

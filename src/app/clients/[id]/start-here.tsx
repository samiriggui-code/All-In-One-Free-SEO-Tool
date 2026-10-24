import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FileText,
  Target,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The order to do things in, for one client.
 *
 * Adding a client used to drop you in front of forty-three tools with no
 * indication of which one comes first, and the one document you are
 * meant to send before any of it — the plan the client approves — was
 * the last card of the last step of a wizard reached by one button in a
 * row of five.
 *
 * Four steps, each reading real state. Nothing here is a checkbox the
 * user ticks: a step is done because the audit exists, the keywords are
 * tracked, the document was built. A checklist that can claim a step is
 * done when it isn't is worse than no checklist.
 */

export type StartHereState = {
  clientId: number;
  /** Latest completed audit, if any. */
  auditDone: boolean;
  auditFindings: number | null;
  keywordCount: number;
  /** The approval document, once built. */
  proposalId: number | null;
  proposalStatus: "draft" | "sent" | "accepted" | "declined" | null;
  onboardingDone: boolean;
};

type Step = {
  n: number;
  title: string;
  icon: typeof Check;
  /** Done means done — derived, never asserted. */
  done: boolean;
  /** What is true right now, in a few words. */
  status: string;
  href: string;
  cta: string;
};

function stepsFor(s: StartHereState, t: ReturnType<typeof useTranslations>): Step[] {
  const c = s.clientId;
  return [
    {
      n: 1,
      title: t("s1Title"),
      icon: ClipboardCheck,
      done: s.auditDone,
      status: s.auditDone
        ? s.auditFindings !== null
          ? t("s1Findings", { count: s.auditFindings })
          : t("s1Done")
        : t("s1NotRun"),
      href: `/audits?clientId=${c}`,
      cta: s.auditDone ? t("s1See") : t("s1Run"),
    },
    {
      n: 2,
      title: t("s2Title"),
      icon: Target,
      done: s.keywordCount > 0 && s.onboardingDone,
      status:
        s.keywordCount > 0
          ? t("s2Tracked", { count: s.keywordCount }) +
            (s.onboardingDone ? "" : t("s2NoScope"))
          : t("s2None"),
      href: `/clients/${c}/onboarding`,
      cta: s.keywordCount > 0 ? t("s2Review") : t("s2Find"),
    },
    {
      n: 3,
      title: t("s3Title"),
      icon: FileText,
      // Built is not sent. A document sitting in draft has not done its
      // job, and calling this step done would hide the only thing left.
      done: s.proposalStatus === "sent" || s.proposalStatus === "accepted",
      status: !s.proposalId
        ? t("s3NotWritten")
        : s.proposalStatus === "accepted"
          ? t("s3Accepted")
          : s.proposalStatus === "sent"
            ? t("s3Sent")
            : s.proposalStatus === "declined"
              ? t("s3Declined")
              : t("s3Draft"),
      href: s.proposalId ? `/proposals/${s.proposalId}/pdf` : `/clients/${c}/onboarding`,
      cta: s.proposalId ? t("s3Open") : t("s3Write"),
    },
    {
      n: 4,
      title: t("s4Title"),
      icon: Wrench,
      done: false,
      status: t("s4Status"),
      href: `/tasks?client=${c}`,
      cta: t("s4Cta"),
    },
  ];
}

export function StartHere(props: StartHereState) {
  const t = useTranslations("clientPage.startHere");
  const steps = stepsFor(props, t);
  // The first step that is not done is the one to do. Step 4 is never
  // "done", so it becomes current once the first three are — which is
  // the right answer: the ongoing work has no completion state.
  const currentIdx = steps.findIndex((s) => !s.done);

  const finishedCount = steps.filter((s) => s.done).length;
  if (finishedCount === 3) {
    // All the setup is behind them. A four-step banner would be nagging
    // at that point, so it collapses to one line.
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 text-xs">
        <Check className="size-3.5 shrink-0 text-emerald-400" />
        <span className="text-emerald-700 dark:text-emerald-200">
          {t("allDone")}
        </span>
        <Link
          href={`/tasks?client=${props.clientId}`}
          className="ml-auto inline-flex items-center gap-1 text-emerald-700 underline decoration-dotted underline-offset-2 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          {t("taskBoard")}
          <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/50 backdrop-blur-md">
      <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <h2 className="text-[13px] font-semibold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("subtitle")}
        </p>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {t("progress", { done: finishedCount })}
        </span>
      </header>

      <ol className="divide-y divide-white/[0.04]">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const current = i === currentIdx;
          return (
            <li
              key={s.n}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                current ? "bg-violet-500/[0.06]" : ""
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                  s.done
                    ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                    : current
                      ? "bg-violet-500/20 text-violet-700 ring-violet-500/40 dark:text-violet-200"
                      : "bg-white/[0.04] text-muted-foreground ring-white/10"
                }`}
              >
                {s.done ? <Check className="size-3.5" /> : s.n}
              </span>

              <Icon
                className={`size-3.5 shrink-0 ${
                  current ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground"
                }`}
              />

              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[13px] leading-tight ${
                    s.done ? "text-muted-foreground" : "font-medium"
                  }`}
                >
                  {s.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {s.status}
                </span>
              </span>

              <Link
                href={s.href}
                {...(s.href.endsWith("/pdf")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors ${
                  current
                    ? "bg-violet-500/15 text-violet-700 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25 dark:text-violet-300"
                    : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                }`}
              >
                {s.cta}
                <ArrowRight className="size-3" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

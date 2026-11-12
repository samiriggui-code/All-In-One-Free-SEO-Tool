"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { askAssistant } from "@/components/shell/ai-assistant";

/**
 * « Demander à l'IA » (IA-6): opens the assistant on a question about
 * what is on screen, with that context already attached. The page keeps
 * its own logic; this only hands the question over.
 */
export function AskAiButton({
  question,
  context,
  clientId,
  label,
  className,
}: {
  question: string;
  /** What the assistant should know about the item, in a few lines. */
  context?: string;
  clientId?: number | null;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("shell.assistant");
  return (
    <button
      type="button"
      onClick={() => askAssistant({ question, context, clientId })}
      title={question}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-300"
      }
    >
      <Sparkles className="size-3.5" />
      {label ?? t("askAi")}
    </button>
  );
}

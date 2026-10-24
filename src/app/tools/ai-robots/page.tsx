import { Bot } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { AiRobotsForm } from "./form";

export const dynamic = "force-dynamic";

/**
 * AI-bot robots.txt audit tool. Paste a URL, get:
 *   - Which of the 15 known AI crawlers your robots.txt actually
 *     addresses (vs falls under the * wildcard, vs missing entirely)
 *   - Whether each one is currently allowed or blocked
 *   - A copy-paste patch block with recommended rules for the ones
 *     you're not addressing explicitly today
 *
 * Why this matters: as of 2026, 10+ major LLM crawlers ignore a plain
 * User-agent: * for opt-out purposes. Explicit rules are the only
 * reliable way to control what enters LLM training corpora.
 */
export default async function AiRobotsPage() {
  const t = await getTranslations("tools.ui.ai-robots");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Bot}
        accent="violet"
      />

      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-[12px] leading-relaxed text-violet-100/90">
        <div className="font-semibold text-violet-200">
          {t("whyTitle")}
        </div>
        <p className="mt-1 opacity-90">
          {t.rich("whyBody", { code: (chunks) => <code>{chunks}</code> })}
        </p>
      </div>

      <AiRobotsForm />
    </div>
  );
}

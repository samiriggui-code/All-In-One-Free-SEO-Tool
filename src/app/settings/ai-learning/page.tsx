export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Brain, Sparkles, Zap } from "lucide-react";
import { db } from "@/db/client";
import { aiFeedback, aiPreferences, clients } from "@/db/schema";
import { count, desc, asc } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import {
  deletePreference,
  togglePreference,
} from "./actions";
import { DistillButton } from "./distill-button";
import { requireSettingsPage } from "../access";

const CONFIDENCE_TONE: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  medium: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  low: "bg-white/5 text-muted-foreground ring-white/10",
};

export default async function AiLearningPage() {
  await requireSettingsPage("/settings/ai-learning");
  const tx = await getTranslations("ui.app_settings_ai-learning_page");
  const [prefs, [{ value: feedbackCount }], allClients] = await Promise.all([
    db
      .select()
      .from(aiPreferences)
      .orderBy(
        // Sort by confidence high → low (string sort works since we set
        // confidence to a fixed enum)
        desc(aiPreferences.confidence),
        desc(aiPreferences.derivedFrom),
      ),
    db.select({ value: count() }).from(aiFeedback),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(await clientScope())
      .orderBy(asc(clients.name)),
  ]);

  const clientNameById = new Map(allClients.map((c) => [c.id, c.name]));
  const workspacePrefs = prefs.filter((p) => p.clientId === null);
  const clientScopedPrefs = prefs.filter((p) => p.clientId !== null);
  const byClient = new Map<number, typeof prefs>();
  for (const p of clientScopedPrefs) {
    if (p.clientId === null) continue;
    const list = byClient.get(p.clientId) ?? [];
    list.push(p);
    byClient.set(p.clientId, list);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <PageHeader
        title={tx("aiLearning")}
        description={tx("theToolWatchesWhatYou")}
        icon={Brain}
        accent="violet"
      />

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">
              {tx("piecesOfFeedbackCollected", { feedbackCount })}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tx("distillTurnsRecentThumbsDown")}
            </p>
          </div>
          <DistillButton />
        </div>
      </section>

      <RuleList
        title={`Workspace-wide rules (${workspacePrefs.length})`}
        rules={workspacePrefs}
        clientNameById={clientNameById}
        emptyHint={tx("workspaceRulesApplyToAi")}
      />

      {byClient.size > 0 &&
        Array.from(byClient.entries()).map(([cid, list]) => (
          <RuleList
            key={cid}
            title={`Rules for ${clientNameById.get(cid) ?? tx("client", { cid })} (${list.length})`}
            rules={list}
            clientNameById={clientNameById}
            emptyHint=""
          />
        ))}

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5 text-sm">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="size-4 text-amber-300" />
          {tx("howItWorks")}
        </h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>{tx("everyAiFeatureHasThumbs")}</li>
          <li>{tx("thumbsDownWithACorrected")}</li>
          <li>
            {tx("onDistillTheAiItself")}
          </li>
          <li>
            {tx("rulesWithMultipleConfirmationsGet")}
          </li>
          <li>
            {tx("activeRulesGetInjectedInto")}
          </li>
        </ol>
      </section>
    </div>
  );
}

function RuleList({
  title,
  rules,
  clientNameById,
  emptyHint,
}: {
  title: string;
  rules: {
    id: number;
    feature: string;
    rule: string;
    confidence: string;
    derivedFrom: number;
    clientId: number | null;
    active: boolean;
  }[];
  clientNameById: Map<number, string>;
  emptyHint: string;
}) {
  const tx = useTranslations("ui.app_settings_ai-learning_page");
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="size-4 text-violet-300" />
          {title}
        </h2>
      </header>
      {rules.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          {emptyHint || tx("noRulesYet")}
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {rules.map((p) => (
            <li
              key={p.id}
              className={`flex items-start gap-3 px-5 py-4 ${
                p.active ? "" : "opacity-50"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${
                  CONFIDENCE_TONE[p.confidence] ?? CONFIDENCE_TONE.low
                }`}
              >
                {p.confidence}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm">{p.rule}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 ring-1 ring-inset ring-white/10">
                    {p.feature}
                  </span>
                  <span>
                    {tx("derivedFromOther", { derivedFrom: p.derivedFrom })}
                  </span>
                  {p.clientId && (
                    <span>
                      {tx("scopedTo")}
                      {clientNameById.get(p.clientId) ??
                        tx("client2", { clientId: p.clientId })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <form action={togglePreference.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10"
                  >
                    {p.active ? tx("disable") : tx("enable")}
                  </button>
                </form>
                <form action={deletePreference.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20"
                  >
                    {tx("delete")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

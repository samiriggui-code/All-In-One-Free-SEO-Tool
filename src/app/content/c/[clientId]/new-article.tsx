"use client";

import { useActionState, useState, useTransition } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createArticle,
  researchKeywords,
  type CreateState,
  type ResearchState,
} from "../../actions";

export function NewArticle({ clientId }: { clientId: number }) {
  const t = useTranslations("content.new");
  const tErr = useTranslations("content.errors");
  const [state, formAction, creating] = useActionState<CreateState, FormData>(createArticle, null);
  const [keyword, setKeyword] = useState("");
  const [ideas, setIdeas] = useState<ResearchState | null>(null);
  const [searching, startSearch] = useTransition();

  const findIdeas = () =>
    startSearch(async () => {
      setIdeas(await researchKeywords({ clientId, seed: keyword }));
    });

  return (
    <section className="space-y-4 rounded-2xl border border-white/5 bg-card/40 p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
      <form action={formAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <input type="hidden" name="clientId" value={clientId} />
        <div className="space-y-1.5">
          <Label htmlFor="keyword">{t("keyword")}</Label>
          <Input
            id="keyword"
            name="keyword"
            required
            minLength={2}
            maxLength={120}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("keywordPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">{t("titleField")}</Label>
          <Input id="title" name="title" maxLength={200} placeholder={t("titlePlaceholder")} />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={searching || keyword.trim().length < 2}
            onClick={findIdeas}
          >
            <Lightbulb />
            {searching ? t("searching") : t("ideas")}
          </Button>
          <Button type="submit" disabled={creating}>
            <Plus />
            {creating ? t("creating") : t("create")}
          </Button>
        </div>
      </form>

      {state && !state.ok && <p className="text-sm text-rose-300">{tErr(state.error)}</p>}

      {ideas && !ideas.ok && <p className="text-sm text-rose-300">{tErr(ideas.error)}</p>}
      {ideas?.ok && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("ideasHint", { count: ideas.suggested.length })}</p>
          <div className="flex flex-wrap gap-1.5">
            {ideas.suggested.map((s) => (
              <button
                key={s.keyword}
                type="button"
                onClick={() => setKeyword(s.keyword)}
                className={
                  s.keyword === keyword
                    ? "rounded-md bg-violet-500/15 px-2 py-1 text-xs text-violet-300 ring-1 ring-inset ring-violet-500/30"
                    : "rounded-md bg-white/5 px-2 py-1 text-xs text-muted-foreground ring-1 ring-inset ring-white/10 hover:text-foreground"
                }
                title={t(`intent.${s.intent.intent}`)}
              >
                {s.keyword}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

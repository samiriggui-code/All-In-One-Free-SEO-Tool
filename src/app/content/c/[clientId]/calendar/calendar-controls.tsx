"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autoScheduleArticles, setArticleDate } from "@/app/content/actions";

/** The date of one article. Saved when it changes; empty clears it. */
export function DateField({ clientId, postId, value }: { clientId: number; postId: number; value: string }) {
  const t = useTranslations("content.calendar");
  const tErr = useTranslations("content.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      <input
        type="date"
        aria-label={t("dateLabel")}
        defaultValue={value}
        disabled={pending}
        onChange={(e) => {
          const date = e.target.value;
          setError(null);
          start(async () => {
            const r = await setArticleDate({ clientId, postId, date });
            if (r.ok) router.refresh();
            else setError(tErr(r.error));
          });
        }}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </span>
  );
}

/** One button: a date for every article that has none. */
export function AutoSchedule({ clientId }: { clientId: number }) {
  const t = useTranslations("content.calendar");
  const tErr = useTranslations("content.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await autoScheduleArticles({ clientId });
            setNote(r.ok ? t("autoDone", { count: r.planned }) : tErr(r.error));
            if (r.ok) router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarPlus className="size-3.5" />}
        {t("auto")}
      </Button>
    </span>
  );
}

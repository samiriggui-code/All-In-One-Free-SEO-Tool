export const dynamic = "force-dynamic";

import { ExternalLink, Video } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { getYouTubeApiKey } from "@/lib/youtube-research";
import { YouTubeResearch } from "./youtube-research";
import { saveYouTubeKey, clearYouTubeKey } from "./actions";

export default async function YouTubeResearchPage() {
  const key = await getYouTubeApiKey();
  const t = await getTranslations("tools.ui.youtube");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Video}
        accent="rose"
      />

      {!key ? (
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
          <h2 className="text-base font-semibold">{t("addKeyTitle")}</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              {t.rich("step1", {
                link: (chunks) => (
                  <a
                    href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-rose-300 hover:underline"
                  >
                    {chunks}
                    <ExternalLink className="size-3" />
                  </a>
                ),
              })}
            </li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
          </ol>
          <form action={saveYouTubeKey} className="mt-4 flex gap-2">
            <input
              name="key"
              required
              type="password"
              autoComplete="off"
              placeholder="AIza…"
              className="h-9 flex-1 rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-rose-500/15 px-4 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/25"
            >
              {t("saveKey")}
            </button>
          </form>
        </section>
      ) : (
        <>
          <YouTubeResearch />
          <form action={clearYouTubeKey}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-rose-300 hover:underline"
            >
              {t("disconnect")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

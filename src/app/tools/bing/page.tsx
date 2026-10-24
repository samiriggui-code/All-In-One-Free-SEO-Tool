export const dynamic = "force-dynamic";

import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { getBingApiKey } from "@/lib/bing-webmaster";
import { BingTool } from "./bing-tool";
import { saveBingKey, clearBingKey } from "./actions";

export default async function BingToolPage() {
  const key = await getBingApiKey();
  const t = await getTranslations("tools.ui.bing");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Search}
        accent="cyan"
      />

      {!key ? (
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
          <h2 className="text-base font-semibold">{t("addKeyTitle")}</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              {t.rich("step1", {
                link: (chunks) => (
                  <a
                    href="https://www.bing.com/webmasters"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                  >
                    {chunks}
                    <ExternalLink className="size-3" />
                  </a>
                ),
              })}
            </li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>
          <form action={saveBingKey} className="mt-4 flex gap-2">
            <input
              name="key"
              required
              type="password"
              autoComplete="off"
              placeholder={t("keyPlaceholder")}
              className="h-9 flex-1 rounded-md border border-white/10 bg-card/60 px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-cyan-500/15 px-4 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25"
            >
              {t("saveKey")}
            </button>
          </form>
        </section>
      ) : (
        <BingTool />
      )}

      {key && (
        <form action={clearBingKey}>
          <button
            type="submit"
            className="text-xs text-muted-foreground hover:text-rose-300 hover:underline"
          >
            {t("disconnect")}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-white/5 bg-black/20 p-4 text-xs text-muted-foreground">
        {t.rich("indexnowHint", {
          link: (chunks) => (
            <Link href="/tools/indexnow" className="underline">
              {chunks}
            </Link>
          ),
        })}
      </div>
    </div>
  );
}

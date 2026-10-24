export const dynamic = "force-dynamic";

import { Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { getOrCreateIndexNowKey } from "@/lib/indexnow";
import { IndexNowForm } from "./indexnow-form";

export default async function IndexNowPage() {
  const key = await getOrCreateIndexNowKey();
  const t = await getTranslations("tools.ui.indexnow");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Zap}
        accent="cyan"
      />

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5 text-sm">
        <h2 className="text-base font-semibold">{t("setupTitle")}</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            {t.rich("step1", {
              path: `/${key}.txt`,
              code: (chunks) => (
                <code className="rounded bg-white/5 px-1.5 py-0.5 ring-1 ring-inset ring-white/10">
                  {chunks}
                </code>
              ),
            })}
          </li>
          <li>
            {t("step2")}
            <pre className="mt-1 overflow-x-auto rounded-md bg-black/20 p-2 font-mono text-xs">
              {key}
            </pre>
          </li>
          <li>
            {t("step3")}
          </li>
        </ol>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t("sameKey")}
        </p>
      </section>

      <IndexNowForm />
    </div>
  );
}

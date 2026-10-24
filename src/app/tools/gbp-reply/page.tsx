export const dynamic = "force-dynamic";

import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { listReplyLocations } from "./actions";
import { ReplyClient } from "./client";

export default async function GbpReplyPage() {
  const r = await listReplyLocations();
  const t = await getTranslations("tools.ui.gbp-reply");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={MessageCircle}
        accent="emerald"
      />
      {r.ok ? (
        <ReplyClient locations={r.locations} />
      ) : (
        <div className="glass-apple rounded-2xl p-5 text-sm text-rose-300">
          {r.error.includes("scope")
            ? t("scopeMissing")
            : t("listError", { error: r.error })}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

import { desc } from "drizzle-orm";
import { CornerDownRight } from "lucide-react";
import { db } from "@/db/client";
import { redirectRules, notFoundLog } from "@/db/schema";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { Manager } from "./manager";

export default async function RedirectsManagerPage() {
  const rules = await db
    .select()
    .from(redirectRules)
    .orderBy(desc(redirectRules.createdAt))
    .limit(500);
  const notFound = await db
    .select()
    .from(notFoundLog)
    .orderBy(desc(notFoundLog.lastSeen))
    .limit(200);
  const t = await getTranslations("tools.ui.redirects-manager");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={CornerDownRight}
        accent="amber"
      />
      <Manager rules={rules} notFound={notFound} />
    </div>
  );
}

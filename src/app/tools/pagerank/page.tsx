export const dynamic = "force-dynamic";

import { Network } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { PagerankForm } from "./pagerank-form";

export default function PagerankPage() {
  const t = useTranslations("tools.ui.pagerank");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        icon={Network}
        accent="violet"
      />
      <PagerankForm />
    </div>
  );
}

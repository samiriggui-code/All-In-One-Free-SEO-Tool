export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { CompareForm } from "./compare-form";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const tx = await getTranslations("ui.app_compare_page");
  const { a, b } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={tx("websiteComparison")}
        description={tx("sideBySideAnalysisAudit")}
        icon={Layers}
        accent="violet"
      />
      <CompareForm initialA={a} initialB={b} />
    </div>
  );
}

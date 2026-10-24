export const dynamic = "force-dynamic";

import { Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shell/page-header";
import { MobileForm } from "./mobile-form";

export default function MobileFriendlyPage() {
  const t = useTranslations("tools.ui.mobile-friendly");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Smartphone}
        accent="emerald"
      />
      <MobileForm />
    </div>
  );
}

export const dynamic = "force-dynamic";

import { Image as ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { OgForm } from "./form";

export default async function OgImagePage() {
  const t = await getTranslations("tools.ui.og-image");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={ImageIcon}
        accent="rose"
      />
      <OgForm />
    </div>
  );
}

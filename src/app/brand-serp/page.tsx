export const dynamic = "force-dynamic";


import { getTranslations } from "next-intl/server";
import { Crown } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { BrandSerpView } from "./view";

export default async function BrandSerpPage() {
  const tx = await getTranslations("ui.app_brand-serp_page");
  const all = await db.select().from(clients).where(await clientScope()).orderBy(clients.name);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("brandSerpMonitor")}
        description={tx("captureTheFullFirstPage")}
        icon={Crown}
        accent="amber"
      />
      <BrandSerpView
        clients={all.map((c) => ({
          id: c.id,
          name: c.name,
          url: c.url,
          socialLinks: c.socialLinks,
        }))}
      />
    </div>
  );
}

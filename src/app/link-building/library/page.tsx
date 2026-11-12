import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Library, Globe } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  PROSPECTS,
  CATEGORY_LABELS,
  COUNTRY_LABELS,
  NICHE_LABELS,
} from "@/lib/backlink-prospects-data";
import { ProspectsLibrary } from "./prospects-library";

export const dynamic = "force-dynamic";

export default function ProspectsLibraryPage() {
  const tx = useTranslations("ui.app_link-building_library_page");
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/link-building"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {tx("backToLinkBuilding")}
      </Link>

      <PageHeader
        title={tx("backlinkProspectsLibrary")}
        description={tx("aCuratedCatalogOfReal")}
        icon={Library}
        accent="emerald"
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-inset ring-white/10">
            <Globe className="size-3" />
            {tx("prospects30Countries", { length: PROSPECTS.length })}
          </span>
        }
      />

      <ProspectsLibrary
        prospects={PROSPECTS}
        categoryLabels={CATEGORY_LABELS}
        countryLabels={COUNTRY_LABELS}
        nicheLabels={NICHE_LABELS}
      />
    </div>
  );
}

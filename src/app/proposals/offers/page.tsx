export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowLeft, Package } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { serviceOffers } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { canEdit, currentUser } from "@/lib/auth";
import { workItemDefaults } from "@/lib/proposal-scope";
import { DEFAULT_HOURLY_RATE } from "@/lib/quote";
import { getSetting } from "@/lib/settings-store";
import { OffersCatalogue } from "./catalogue";

export default async function OffersPage() {
  const [t, locale, me, offers, rate, minutes] = await Promise.all([
    getTranslations("proposals.offers"),
    getLocale(),
    currentUser(),
    db.select().from(serviceOffers).orderBy(asc(serviceOffers.position), asc(serviceOffers.id)),
    getSetting<number>("quote.hourly_rate"),
    getSetting<Record<string, number>>("quote.minutes"),
  ]);
  const editable = !me || canEdit(me.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        {t("back")}
      </Link>
      <PageHeader title={t("title")} description={t("description")} icon={Package} accent="violet" />
      <OffersCatalogue
        editable={editable}
        offers={offers.map((o) => ({
          id: o.id,
          name: o.name,
          kind: o.kind,
          billing: o.billing,
          summary: o.summary ?? "",
          deliverables: o.deliverables,
          estimatedHours: o.estimatedHours,
          duration: o.duration,
          price: o.price,
          active: o.active,
        }))}
        hourlyRate={rate ?? DEFAULT_HOURLY_RATE}
        workItems={workItemDefaults(locale).map((w) => ({
          ...w,
          minutesEach: minutes?.[w.key] ?? w.minutesEach,
        }))}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { getSetting } from "@/lib/settings-store";
import { requireSettingsPage } from "../access";
import { BrandForm } from "../brand-form";
import { SectionHeader } from "../section-ui";

export default async function BrandSettingsPage() {
  await requireSettingsPage("/settings/brand");
  const t = await getTranslations("settings.brand");

  const [name, color, logo, tagline, website, email, phone, footer] = await Promise.all([
    getSetting<string>("brand.name"),
    getSetting<string>("brand.color"),
    getSetting<string>("brand.logo_data_url"),
    getSetting<string>("brand.tagline"),
    getSetting<string>("brand.website"),
    getSetting<string>("brand.email"),
    getSetting<string>("brand.phone"),
    getSetting<string>("brand.footer_text"),
  ]);

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />
      <BrandForm
        initialName={name}
        initialColor={color}
        initialLogoDataUrl={logo}
        initialTagline={tagline}
        initialWebsite={website}
        initialEmail={email}
        initialPhone={phone}
        initialFooterText={footer}
      />
    </>
  );
}

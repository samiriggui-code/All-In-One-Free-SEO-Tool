export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { requireSettingsPage } from "../access";
import { UpdateCard } from "../update-card";
import { SectionHeader } from "../section-ui";

export default async function UpdatesSettingsPage() {
  await requireSettingsPage("/settings/updates");
  const t = await getTranslations("settings.updates");

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />
      <UpdateCard />
    </>
  );
}

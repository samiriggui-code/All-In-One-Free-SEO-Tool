export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { buildWeeklyDigest } from "@/lib/weekly-digest";
import { DigestView } from "./view";
import { loadDigestSettings } from "./actions";

export default async function DigestPage() {
  const tx = await getTranslations("ui.app_digest_page");
  const [digest, settings] = await Promise.all([
    buildWeeklyDigest(),
    loadDigestSettings(),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("weeklyDigest")}
        description={tx("theMondayMorningAgencyOwner")}
        icon={Mail}
        accent="cyan"
      />
      <DigestView
        digest={digest}
        initialEmail={settings.recipientEmail}
        autoSendEnabled={settings.autoSendEnabled}
        lastSentAt={settings.lastSentAt}
      />
    </div>
  );
}

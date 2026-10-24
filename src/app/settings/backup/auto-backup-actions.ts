"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { requireSettingsAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings-store";

/**
 * Save the auto-backup preferences. Bound to the form on
 * AutoBackupCard. Clamps inputs to sane ranges so a malicious or
 * accidental "retention=999999999" can't fill the disk.
 */
export async function saveAutoBackupSettings(formData: FormData) {
  await requireSettingsAdmin();
  await requireSignedIn();
  const enabled = formData.get("enabled") === "on";
  const cadenceRaw = Number(formData.get("cadence_hours"));
  const retentionRaw = Number(formData.get("retention"));

  const cadence =
    Number.isFinite(cadenceRaw) && cadenceRaw >= 1 && cadenceRaw <= 720
      ? Math.round(cadenceRaw)
      : 24;
  const retention =
    Number.isFinite(retentionRaw) && retentionRaw >= 1 && retentionRaw <= 365
      ? Math.round(retentionRaw)
      : 7;

  await setSetting("autobackup.enabled", enabled);
  await setSetting("autobackup.cadence_hours", cadence);
  await setSetting("autobackup.retention", retention);
  revalidatePath("/settings/backup");
}

"use client";

/**
 * Shown when the user clicked "Generate report" but workspace branding
 * (name + logo) isn't filled in. Renders inline at the top of the client
 * page when ?branding-needed=1 is in the URL.
 *
 * Two paths out:
 *   - Set branding now → /settings#brand (returns here with the param)
 *   - Skip for this client → POST /api/clients/{id}/skip-branding, then
 *     re-trigger the report download for the original template.
 *
 * Once dismissed in either direction, the banner won't re-appear for
 * this client (branding_skipped flag persists in DB).
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Palette, X, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { safeFetch } from "@/lib/safe-fetch";

type Props = {
  clientId: number;
  /** The report template the user originally clicked (e.g. "executive"). */
  template: string;
};

export function BrandingPreflightBanner({ clientId, template }: Props) {
  const router = useRouter();
  const t = useTranslations("clientPage.brandingPreflight");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  async function skipForThisClient() {
    setBusy(true);
    const r = await safeFetch<{ ok: boolean }>(
      `/api/clients/${clientId}/skip-branding`,
      { method: "POST" },
    );
    if (!r.ok) {
      toast.error(t("saveFailed"), { description: r.error });
      setBusy(false);
      return;
    }
    toast.success(t("skipped"), {
      description: t("generating"),
    });
    // Trigger the original report download in a new tab so the user
    // doesn't lose context. The route now skips the pre-flight check.
    window.open(`/reports/${clientId}?template=${template}`, "_blank");
    setDismissed(true);
    router.refresh();
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-foreground">
      <Palette className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("title")}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("body")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/settings?brand-return=${clientId}&template=${template}#brand`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Palette className="size-3.5" />
            {t("setNow")}
          </Link>
          <button
            type="button"
            onClick={skipForThisClient}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            {t("skip")}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

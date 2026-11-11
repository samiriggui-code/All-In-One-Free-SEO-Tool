import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertCircle, ExternalLink } from "lucide-react";
import { hasGmailScope } from "@/lib/gmail-scope";
import { getGoogleConnectionStatus } from "@/lib/google-oauth";

/**
 * Server component shown on outreach surfaces when Google IS connected
 * but the gmail.readonly scope wasn't granted. Tells the user how to
 * unlock auto-detection of replies. Renders nothing if Google's not
 * connected at all (the existing "connect Google" prompt covers that).
 */
export async function GmailScopeBanner() {
  let status: Awaited<ReturnType<typeof getGoogleConnectionStatus>>;
  try {
    status = await getGoogleConnectionStatus();
  } catch {
    return null;
  }
  if (!status.configured) return null;

  let scopeOk = true;
  try {
    scopeOk = await hasGmailScope();
  } catch {
    scopeOk = true; // don't show the banner on a transient error
  }
  if (scopeOk) return null;
  const t = await getTranslations("gmailScope.banner");

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">
            {t("title")}
          </p>
          <p className="text-amber-200/80">
            {t("body")}
          </p>
          <Link
            href="/settings/google"
            className="inline-flex items-center gap-1 text-amber-100 underline hover:no-underline"
          >
            {t("reconnect")}
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

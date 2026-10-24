"use server";

import { requireSignedIn } from "@/lib/action-guard";

import {
  findPostIdByUrl,
  getClientWpCreds,
  pingWpBridge,
  setPostSeo,
} from "@/lib/wp-bridge";
import { logActivity } from "@/lib/activity";
import { getTranslations } from "next-intl/server";

export type WpApplyResult =
  | { ok: true; postId: number; field: string; oldValue: string | null }
  | { ok: false; error: string };

/**
 * Apply a single audit fix (title / meta / canonical) to a WordPress post
 * via the SEO Tool Bridge plugin. Used by the FixWizard's "Apply via WP"
 * button.
 *
 * Steps:
 *   1. Pull WP creds from clients table for this client.
 *   2. Ping the bridge so we fail fast if the plugin isn't reachable.
 *   3. Resolve the public URL to a post ID.
 *   4. Patch the right field. Returns the prior value so the UI can show
 *      "undo" if the user wants to revert.
 *   5. Log to activity log so the change shows in the bell + activity feed.
 */
export async function applyFixViaWp(opts: {
  clientId: number;
  pageUrl: string;
  issueType: string;
  newValue: string;
}): Promise<WpApplyResult> {
  await requireSignedIn();
  const { clientId, pageUrl, issueType, newValue } = opts;
  const t = await getTranslations("auditUi.fix");

  if (!Number.isFinite(clientId) || clientId <= 0) {
    return { ok: false, error: t("invalidClient") };
  }
  if (!pageUrl) return { ok: false, error: t("missingUrl") };
  if (!newValue?.trim()) return { ok: false, error: t("missingValue") };

  const creds = await getClientWpCreds(clientId);
  if (!creds) {
    return {
      ok: false,
      error: t("notConnected"),
    };
  }

  const ping = await pingWpBridge(creds);
  if (!ping.ok) {
    return {
      ok: false,
      error: t("unreachable", { error: String(ping.error) }),
    };
  }

  const postId = await findPostIdByUrl(creds, pageUrl);
  if (postId === null) {
    return {
      ok: false,
      error: t("postNotFound"),
    };
  }

  // Map issue type → which field to patch
  let field: string;
  let result: { ok: boolean; error?: string };

  if (
    issueType === "missing_title" ||
    issueType === "short_title" ||
    issueType === "long_title"
  ) {
    field = "title";
    result = await setPostSeo(creds, postId, { title: newValue });
  } else if (
    issueType === "missing_meta_description" ||
    issueType === "short_meta_description" ||
    issueType === "long_meta_description"
  ) {
    field = "metaDescription";
    result = await setPostSeo(creds, postId, { metaDescription: newValue });
  } else if (
    issueType === "missing_canonical" ||
    issueType === "canonical_mismatch"
  ) {
    field = "canonical";
    result = await setPostSeo(creds, postId, { canonical: newValue });
  } else {
    return {
      ok: false,
      error: t("unsupported", { type: issueType }),
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      error: t("rejected", { error: result.error ?? t("unknownError") }),
    };
  }

  await logActivity({
    kind: "task.completed",
    message: `Applied ${field} fix via WordPress bridge for ${pageUrl}`,
    level: "success",
    clientId,
  }).catch(() => undefined);

  return { ok: true, postId, field, oldValue: null };
}

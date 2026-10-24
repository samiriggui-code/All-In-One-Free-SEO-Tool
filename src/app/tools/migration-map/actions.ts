"use server";

import { getTranslations } from "next-intl/server";
import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { redirectRules } from "@/db/schema";
import {
  buildMigrationMap,
  renderRedirectMap,
  type MigrationMap,
} from "@/lib/migration-mapper";
import { saveToolRun } from "@/lib/tool-runs";

export type MigrationState =
  | {
      ok: true;
      map: MigrationMap;
      output: { nginx: string; apache: string; nextjs: string };
    }
  | { ok: false; error: string };

function splitList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 1000);
}

export type ImportState =
  | { ok: true; inserted: number }
  | { ok: false; error: string };

/**
 * Take old + new URL lists, run the mapper, and persist confident-match
 * rows (≥85% confidence) into redirect_rules. The user can then edit /
 * delete from the redirect manager.
 */
export async function importToRedirectRules(
  _prev: ImportState | null,
  formData: FormData,
): Promise<ImportState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.migration-map");
  const oldRaw = String(formData.get("oldUrls") ?? "");
  const newRaw = String(formData.get("newUrls") ?? "");
  const olds = splitList(oldRaw);
  const news = splitList(newRaw);
  if (olds.length === 0 || news.length === 0)
    return { ok: false, error: t("errBothLists") };

  try {
    const map = buildMigrationMap({ oldUrls: olds, newUrls: news });
    const usable = map.rows.filter((r) => r.newUrl && r.confidence >= 0.85);
    if (usable.length === 0)
      return {
        ok: false,
        error: t("errNoHighConfidence"),
      };

    let inserted = 0;
    for (const r of usable) {
      try {
        const u = new URL(
          /^https?:\/\//i.test(r.oldUrl) ? r.oldUrl : `https://x${r.oldUrl}`,
        );
        const sourcePath = u.pathname + (u.search ?? "");
        await db.insert(redirectRules).values({
          sourcePath,
          targetUrl: r.newUrl ?? "",
          statusCode: 301,
          note: t("ruleNote", { pct: (r.confidence * 100).toFixed(0) }),
        });
        inserted += 1;
      } catch {
        // skip invalid rows
      }
    }
    revalidatePath("/tools/redirects-manager");
    return { ok: true, inserted };
  } catch (err) {
    return { ok: false, error: (err as Error).message || t("errImportFailed") };
  }
}

export async function runMapping(
  _prev: MigrationState | null,
  formData: FormData,
): Promise<MigrationState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.migration-map");
  const oldRaw = String(formData.get("oldUrls") ?? "");
  const newRaw = String(formData.get("newUrls") ?? "");
  const olds = splitList(oldRaw);
  const news = splitList(newRaw);
  if (olds.length === 0)
    return { ok: false, error: t("errNoOld") };
  if (news.length === 0)
    return { ok: false, error: t("errNoNew") };
  try {
    const map = buildMigrationMap({ oldUrls: olds, newUrls: news });
    const output = renderRedirectMap(map);
    await saveToolRun({
      toolId: "migration-map",
      label: t("runLabel", {
        old: olds.length,
        new: news.length,
        matched: map.rows.length,
      }),
      input: { oldCount: olds.length, newCount: news.length },
      result: { ok: true, map, output },
    }).catch(() => undefined);
    return { ok: true, map, output };
  } catch (err) {
    return { ok: false, error: (err as Error).message || t("errMappingFailed") };
  }
}

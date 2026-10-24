"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import {
  getOrCreateIndexNowKey,
  submitToIndexNow,
  verifyKeyFile,
} from "@/lib/indexnow";
import { saveToolRun } from "@/lib/tool-runs";

const submitSchema = z.object({
  host: z.string().trim().min(3).max(255),
  urls: z.string().trim().min(1).max(200_000),
});

export type SubmitState =
  | {
      ok: true;
      submitted: number;
      status: number;
      key: string;
      keyUrl: string;
    }
  | { ok: false; error: string; status?: number; key?: string; keyUrl?: string };

export async function submitIndexNow(
  _prev: SubmitState | null,
  formData: FormData,
): Promise<SubmitState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.indexnow");
  const parsed = submitSchema.safeParse({
    host: formData.get("host"),
    urls: formData.get("urls"),
  });
  if (!parsed.success) {
    return { ok: false, error: t("invalidInput") };
  }

  const urls = parsed.data.urls
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) return { ok: false, error: t("noUrls") };

  const key = await getOrCreateIndexNowKey();
  let host: string;
  try {
    host = new URL(
      /^https?:\/\//i.test(parsed.data.host)
        ? parsed.data.host
        : `https://${parsed.data.host}`,
    ).hostname.toLowerCase();
  } catch {
    return { ok: false, error: t("invalidHost") };
  }
  const keyUrl = `https://${host}/${key}.txt`;

  const result = await submitToIndexNow({ host, urls, key });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      status: result.status,
      key,
      keyUrl,
    };
  }
  await saveToolRun({
    toolId: "indexnow",
    label: `${host} · ${result.submitted} URLs · ${result.status}`,
    input: { host, urlCount: urls.length },
    result: {
      ok: true,
      submitted: result.submitted,
      status: result.status,
      key,
      keyUrl,
    },
  }).catch(() => undefined);
  return {
    ok: true,
    submitted: result.submitted,
    status: result.status,
    key,
    keyUrl,
  };
}

export async function verifyIndexNowKeyFile(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requireSignedIn();
  const host = String(formData.get("host") ?? "").trim();
  if (!host) {
    const t = await getTranslations("tools.ui.indexnow");
    return { ok: false, error: t("hostRequired") };
  }
  const key = await getOrCreateIndexNowKey();
  return await verifyKeyFile({ host, key });
}

"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import {
  validateSchemaFromUrl,
  type SchemaValidationResult,
} from "@/lib/page-inspectors";
import { recordToolRun, type FindingDraft } from "@/lib/tool-findings";
import { clientIdFrom } from "@/lib/client-id-field";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(3)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url()),
});

export type ValidateState =
  | { ok: true; result: SchemaValidationResult }
  | { ok: false; error: string };

/**
 * Structured data that will not do what it was added for.
 *
 * Deliberately NOT mapped to the agent's write_schema. That capability
 * writes a block where none exists; this tool reports blocks that exist
 * and are wrong, and overwriting somebody's hand-written schema because
 * one field is missing is a different and much larger decision than
 * filling an empty slot.
 *
 * Errors and warnings are separate findings because they mean different
 * things: an error means Google will not use the block at all, a warning
 * means it will use it and show less.
 */
type Translate = Awaited<ReturnType<typeof getTranslations>>;

function schemaFindings(
  r: SchemaValidationResult,
  t: Translate,
): FindingDraft[] {
  const out: FindingDraft[] = [];

  if (r.blocks.length === 0) {
    out.push({
      signature: "schema-validate.none",
      title: t("findings.noneTitle"),
      severity: "low",
      category: "structured-data",
      details: t("findings.noneDetails"),
    });
    return out;
  }

  const broken = r.blocks.filter((b) => b.errors.length > 0);
  if (broken.length > 0) {
    out.push({
      signature: "schema-validate.errors",
      title: t("findings.errorsTitle", { count: broken.length }),
      // An invalid block is not partially useful. Google discards it, so
      // the markup is doing nothing at all.
      severity: "medium",
      category: "structured-data",
      details:
        broken
          .map(
            (b) =>
              `${typeName(b.type)}: ${b.errors.slice(0, 3).join("; ")}`,
          )
          .join(" | ") + t("findings.errorsDetails"),
    });
  }

  const warned = r.blocks.filter(
    (b) => b.errors.length === 0 && b.warnings.length > 0,
  );
  if (warned.length > 0) {
    out.push({
      signature: "schema-validate.warnings",
      title: t("findings.warningsTitle", { count: warned.length }),
      severity: "low",
      category: "structured-data",
      details:
        warned
          .map((b) => `${typeName(b.type)}: ${b.warnings.slice(0, 3).join("; ")}`)
          .join(" | ") + t("findings.warningsDetails"),
    });
  }

  return out;
}

function typeName(t: string | string[] | null): string {
  if (Array.isArray(t)) return t.join("/") || "block";
  return t ?? "block";
}

export async function runValidate(
  _prev: ValidateState | null,
  formData: FormData,
): Promise<ValidateState> {
  await requireSignedIn();
  const t = await getTranslations("tools.ui.schema-validate");
  const parsed = schema.safeParse({ url: formData.get("url") });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? t("invalidUrl") };
  const r = await validateSchemaFromUrl(parsed.data.url);
  if (!r.ok && r.error) return { ok: false, error: r.error };
  const clientId = clientIdFrom(formData);
  await recordToolRun({
    toolId: "schema-validate",
    label: `${parsed.data.url} · ${r.totalErrors} error${r.totalErrors === 1 ? "" : "s"}`,
    clientId,
    input: { url: parsed.data.url, clientId },
    result: { ok: true, result: r },
    findings: schemaFindings(r, t),
  });
  return { ok: true, result: r };
}

import { desc } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { guardrailIncidents } from "@/db/schema";
import { MODEL_PRESETS, PROVIDER_LABEL } from "@/lib/ai-model-presets";
import {
  AI_PURPOSES,
  EMBEDDING_PRESETS,
  normalizePurposeModel,
  purposeSettingKey,
  type AiPurpose,
} from "@/lib/ai-purpose";
import type { ActiveProvider } from "@/lib/api-keys";
import { normalizeGuardrails } from "@/lib/guardrails";
import { getSetting } from "@/lib/settings-store";
import { SettingsBlock } from "../section-ui";
import { GuardrailsForm, PurposeModelRow, type ModelOption } from "./ai-defaults";

/** Providers whose image input ai-vision.ts sends; the others drop the image. */
const VISION_PROVIDERS: ActiveProvider[] = ["gemini", "anthropic", "openai", "openrouter"];

function optionsFor(purpose: AiPurpose, configured: ActiveProvider[]): ModelOption[] {
  const out: ModelOption[] = [];
  for (const provider of configured) {
    const label = PROVIDER_LABEL[provider] ?? provider;
    if (purpose === "embeddings") {
      for (const m of EMBEDDING_PRESETS[provider] ?? []) {
        out.push({ provider, model: m.id, label: `${label} · ${m.label}` });
      }
      continue;
    }
    if (purpose === "vision" && !VISION_PROVIDERS.includes(provider)) continue;
    for (const m of MODEL_PRESETS[provider] ?? []) {
      out.push({ provider, model: m.id, label: `${label} · ${m.label}` });
    }
  }
  return out;
}

/**
 * Settings → AI, below the keys: the model for each use, then the local
 * guardrails and their latest incidents. Owner only (the page checks).
 */
export async function AiDefaultsSection({ configured }: { configured: ActiveProvider[] }) {
  const t = await getTranslations("settings.aiDefaults");
  const format = await getFormatter();

  const current = await Promise.all(
    AI_PURPOSES.map(async (p) => ({
      purpose: p,
      choice: normalizePurposeModel(await getSetting<unknown>(purposeSettingKey(p)), p),
    })),
  );

  const guard = normalizeGuardrails({
    mode: await getSetting<string>("guardrails.mode"),
    blockedTerms: await getSetting<string[]>("guardrails.blocked_terms"),
  });

  let incidents: (typeof guardrailIncidents.$inferSelect)[] = [];
  try {
    incidents = await db
      .select()
      .from(guardrailIncidents)
      .orderBy(desc(guardrailIncidents.createdAt), desc(guardrailIncidents.id))
      .limit(20);
  } catch {
    // Table missing until the migration runs: show no incidents.
  }

  return (
    <>
      <SettingsBlock id="ai-defaults" title={t("defaultsTitle")} description={t("defaultsHint")}>
        <div>
          {current.map(({ purpose, choice }) => (
            <PurposeModelRow
              key={purpose}
              purpose={purpose}
              options={optionsFor(purpose, configured)}
              current={choice}
            />
          ))}
        </div>
      </SettingsBlock>

      <SettingsBlock id="guardrails" title={t("guardTitle")} description={t("guardHint")}>
        <GuardrailsForm mode={guard.mode} blockedTerms={guard.blockedTerms} />
        <div className="gsk-row">
          <div className="gsk-row-info">
            <span className="gsk-row-label">{t("incidentsTitle")}</span>
            <p className="gsk-row-desc">{t("incidentsHint")}</p>
          </div>
        </div>
        {incidents.length === 0 ? (
          <p className="gsk-note">{t("noIncidents")}</p>
        ) : (
          <ul className="gsk-list m-0 list-none p-0">
            {incidents.map((i) => (
              <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 text-[13px]">
                <span>
                  <strong>{t(`actions.${i.action === "block" ? "block" : "mask"}`)}</strong>{" "}
                  {t(`directions.${i.direction === "out" ? "out" : "in"}`)} ·{" "}
                  {Object.entries(i.kinds ?? {})
                    .map(([k, n]) => `${t.has(`kinds.${k}`) ? t(`kinds.${k}`) : k} × ${n}`)
                    .join(", ")}
                  {i.feature ? <span className="gsk-value--muted"> · {i.feature}</span> : null}
                </span>
                <span className="gsk-value--muted">
                  {format.dateTime(i.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SettingsBlock>
    </>
  );
}

import { useTranslations } from "next-intl";
import type { Integration, IntegrationTier } from "./integrations";

/**
 * The connection catalogue, in the reader's language.
 *
 * `integrations.ts` stays the single definition (ids, links, order) and
 * keeps its English wording for the server and the tests. Screens read
 * the text through here, from `messages/*.json` under `integrations`,
 * keyed by the integration's id and the line's position.
 */
export function useIntegrationText() {
  const t = useTranslations("integrations");
  return {
    item: (i: Integration): Integration => ({
      ...i,
      label: t(`items.${i.id}.label`),
      whatYouGet: i.whatYouGet.map((_, n) => t(`items.${i.id}.whatYouGet.${n}`)),
      withoutIt: t(`items.${i.id}.withoutIt`),
      steps: i.steps.map((_, n) => t(`items.${i.id}.steps.${n}`)),
      setupLabel: t(`items.${i.id}.setupLabel`),
      keyUrlLabel: i.keyUrlLabel ? t(`items.${i.id}.keyUrlLabel`) : undefined,
    }),
    groupLabel: (g: Integration["group"]) => t(`groups.${g}.label`),
    groupBlurb: (g: Integration["group"]) => t(`groups.${g}.blurb`),
    tier: (tier: IntegrationTier) => t(`tiers.${tier}`),
  };
}

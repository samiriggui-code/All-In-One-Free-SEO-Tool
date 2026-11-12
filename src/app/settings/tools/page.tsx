export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { canManageSettings } from "@/lib/auth";
import { getAiAvailability } from "@/lib/ai-availability";
import { getGoogleConnectionStatus } from "@/lib/google-oauth";
import { aiUsageOf, capabilityOf } from "@/lib/tool-capabilities";
import { toolReadiness } from "@/lib/tool-readiness";
import { getDisabledTools } from "@/lib/tool-activation";
import { TOOL_CATALOG } from "@/lib/tool-catalog";
import { requireSettingsPage } from "../access";
import { SectionHeader } from "../section-ui";
import { ToolsPanel, type ToolCard } from "./tools-panel";

/**
 * Settings → Tools: the catalogue of every tool, grouped by kind of
 * mission. A card says whether the tool is ready, needs setup, or is
 * turned off; its sheet lists what it needs and holds the on/off switch.
 * Tools are used from projects, missions and search, not from here.
 */
export default async function ToolsSettingsPage() {
  const me = await requireSettingsPage("/settings/tools");
  const isAdmin = !me || canManageSettings(me.role);
  const t = await getTranslations("settings.tools");

  const [disabled, ai, google] = await Promise.all([
    getDisabledTools(),
    getAiAvailability(),
    getGoogleConnectionStatus().catch(() => ({ connected: false })),
  ]);

  const cards: ToolCard[] = TOOL_CATALOG.map((e) => {
    const cap = capabilityOf(e.href);
    const usage = cap ? aiUsageOf(cap) : "none";
    // The one readiness rule (tool-readiness.ts): a tool counts as
    // needing a key only where that is confirmed, not merely derived.
    const aiRequired =
      usage === "required" && toolReadiness({ href: e.href, hasAiKey: false }).state === "blocked";
    const missingGsc = e.needs === "gsc" && !google.connected;
    const blocked =
      toolReadiness({ href: e.href, hasAiKey: ai.available, needs: missingGsc ? "gsc" : null })
        .state === "blocked";
    const off = disabled.has(e.href);
    return {
      href: e.href,
      category: e.category,
      aiUsage: aiRequired ? "required" : usage === "none" ? "none" : "partial",
      usesBrowser: Boolean(cap?.usesBrowser),
      needsGsc: e.needs === "gsc",
      offByDefault: Boolean(e.offByDefault),
      state: off ? "off" : blocked ? "setup" : "ready",
    };
  });

  return (
    <>
      <SectionHeader title={t("title")} description={t("description")} />
      <ToolsPanel
        cards={cards}
        canToggle={isAdmin}
        hasAiKey={ai.available}
        gscConnected={google.connected}
      />
    </>
  );
}

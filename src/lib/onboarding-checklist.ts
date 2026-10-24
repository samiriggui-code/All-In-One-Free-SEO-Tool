/**
 * Onboarding checklist — server-side detector. Each step is derived from
 * real database state, not a "completed" flag the user has to toggle, so
 * progress is always accurate and recovers if the user wipes / restores
 * their data.db.
 *
 * Called from the dashboard. Results live for one request (force-dynamic
 * page) so users see ticks update as they complete each step.
 */

import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { audits, clients, reportArchives } from "@/db/schema";
import { count, eq, ne } from "drizzle-orm";
import { getAiAvailability } from "./ai-availability";
import { getGoogleConnectionStatus } from "./google-oauth";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  cta: string;
  href: string;
};

export async function getOnboardingChecklist(): Promise<{
  steps: ChecklistItem[];
  done: number;
  total: number;
}> {
  const t = await getTranslations("dashboard.checklist");
  // Run all detection queries in parallel
  const [
    [{ value: clientCount }],
    [{ value: completedAuditCount }],
    [{ value: reportCount }],
    googleStatus,
    aiAvailability,
  ] = await Promise.all([
    db.select({ value: count() }).from(clients),
    db
      .select({ value: count() })
      .from(audits)
      .where(eq(audits.status, "completed")),
    db.select({ value: count() }).from(reportArchives),
    getGoogleConnectionStatus().catch(() => ({ connected: false })),
    getAiAvailability().catch(() => ({
      available: false,
      hasKey: false,
      hasSubscription: false,
      client: null,
    })),
  ]);

  const steps: ChecklistItem[] = [
    {
      id: "ai-provider",
      title: t("ai.title"),
      // Explains why a connected chat app does not tick this.
      //
      // It briefly counted a connected subscription and that was wrong:
      // MCP does not let this app call a model, so the AI pages here
      // still fail. Ticking it would have meant the checklist said
      // "done" about features that do not run. Saying plainly that the
      // subscription is connected but powers a different thing is the
      // honest version, and stops the step reading as a bug.
      description: aiAvailability.hasSubscription
        ? t("ai.subscription", { client: aiAvailability.client ?? "" })
        : t("ai.description"),
      done: aiAvailability.available,
      cta: aiAvailability.available ? t("ai.manage") : t("ai.add"),
      href: "/settings#ai",
    },
    {
      id: "first-client",
      title: t("client.title"),
      description:
        t("client.description"),
      done: clientCount > 0,
      cta: clientCount > 0 ? t("client.view") : t("client.add"),
      href: clientCount > 0 ? "/clients" : "/clients/new",
    },
    {
      id: "google-oauth",
      title: t("google.title"),
      description:
        t("google.description"),
      done: googleStatus.connected,
      cta: googleStatus.connected ? t("google.manage") : t("google.connect"),
      href: "/settings#google",
    },
    {
      id: "first-audit",
      title: t("audit.title"),
      description:
        t("audit.description"),
      done: completedAuditCount > 0,
      cta: completedAuditCount > 0 ? t("audit.view") : t("audit.run"),
      href: "/audits",
    },
    {
      id: "first-report",
      title: t("report.title"),
      description:
        t("report.description"),
      done: reportCount > 0,
      cta: reportCount > 0 ? t("report.view") : t("report.generate"),
      href: "/reports",
    },
  ];

  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length };
}

// Suppress unused warning on ne — kept for future per-status detections.
void ne;

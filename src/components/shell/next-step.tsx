/**
 * Workspace-state-aware "what to do next" pill. Lives in the topbar so it
 * follows the user across every page. Server-rendered: reads minimal
 * workspace state, picks the most-impactful unfinished step, renders a
 * one-line CTA that links to the right page.
 *
 * The list is intentionally ordered: a user without an AI provider should
 * NEVER be told to "run an audit" first — that misses the point.
 */

import Link from "next/link";
import { cookies } from "next/headers";
import { count, eq, gte } from "drizzle-orm";
import { ArrowRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import {
  clients,
  audits,
  keywords,
  reportArchives,
  tasks,
} from "@/db/schema";
import { getAiAvailability } from "@/lib/ai-availability";
import { getGoogleConnectionStatus } from "@/lib/google-oauth";
import { NextStepDismissButton } from "./next-step-dismiss";

const DISMISS_COOKIE_PREFIX = "next-step-dismissed-";

/** `id` doubles as the message key under shell.nextStep. */
type Step = {
  id: "ai" | "client" | "google" | "audit" | "keywords" | "report" | "tasks" | "morning";
  href: string;
  /** For labels that need a number ("3 open tasks"). */
  count?: number;
  primary?: boolean;
};

async function isDismissed(stepId: string): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(`${DISMISS_COOKIE_PREFIX}${stepId}`)?.value === "1";
  } catch {
    return false;
  }
}

/**
 * Wrap a step so the picker can `await maybe(step)` and have it
 * silently swap to the fallback when the user has dismissed it.
 * The next priority tier in the chain takes over automatically.
 */
async function maybe(step: Step | null): Promise<Step | null> {
  if (!step) return null;
  if (await isDismissed(step.id)) return null;
  return step;
}

async function pickNextStep(): Promise<Step | null> {
  // 1. AI provider — without it most tools degrade. Highest priority.
  //
  // Asks whether AI is available at all, not whether a key exists: a
  // connected Claude or ChatGPT subscription drives the same tools, and
  // testing only for keys kept telling people to set up something they
  // had already set up.
  const { available: aiAvailable } = await getAiAvailability().catch(() => ({
    available: false,
    hasKey: false,
    hasSubscription: false,
    client: null,
  }));
  if (!aiAvailable) {
    const s = await maybe({
      id: "ai",
      href: "/settings#ai",
      primary: true,
    });
    if (s) return s;
  }

  // 2. At least one client
  const [{ value: clientCount }] = await db
    .select({ value: count() })
    .from(clients);
  if (clientCount === 0) {
    const s = await maybe({
      id: "client",
      href: "/clients/new",
      primary: true,
    });
    if (s) return s;
  }

  // 3. Google connection (workspace-wide). Skippable but worth surfacing.
  const gStatus = await getGoogleConnectionStatus().catch(() => ({
    configured: false,
    connected: false,
    credentialsSet: false,
  }));
  if (!gStatus.configured) {
    const s = await maybe({
      id: "google",
      href: "/settings/google",
    });
    if (s) return s;
  }

  // 4. First audit
  const [{ value: auditCount }] = await db
    .select({ value: count() })
    .from(audits);
  if (auditCount === 0) {
    const s = await maybe({
      id: "audit",
      href: "/audits",
      primary: true,
    });
    if (s) return s;
  }

  // 5. First keyword tracked
  const [{ value: keywordCount }] = await db
    .select({ value: count() })
    .from(keywords);
  if (keywordCount === 0) {
    const s = await maybe({
      id: "keywords",
      href: "/keywords",
    });
    if (s) return s;
  }

  // 6. First report — closes the loop on the value prop
  const [{ value: reportCount }] = await db
    .select({ value: count() })
    .from(reportArchives);
  if (reportCount === 0) {
    const s = await maybe({
      id: "report",
      href: "/reports",
    });
    if (s) return s;
  }

  // 7. Open tasks → highlight if there are any
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [openTasks] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.status, "todo"));
  const [recentlyDone] = await db
    .select({ value: count() })
    .from(tasks)
    .where(gte(tasks.updatedAt, since));
  if ((openTasks?.value ?? 0) > 0 && (recentlyDone?.value ?? 0) < 1) {
    const s = await maybe({
      id: "tasks",
      href: "/tasks",
      count: openTasks?.value ?? 0,
    });
    if (s) return s;
  }

  // Everything bootstrapped (or all suggestions dismissed) — suggest
  // the daily-flow page. Also dismissable.
  return await maybe({
    id: "morning",
    href: "/morning",
  });
}

export async function NextStep() {
  let step: Step | null = null;
  try {
    step = await pickNextStep();
  } catch {
    step = null;
  }
  if (!step) return null;
  const t = await getTranslations("shell.nextStep");
  const label = t(`${step.id}.label`, { count: step.count ?? 0 });
  const detail = t(`${step.id}.detail`);

  return (
    <div
      className={`hidden max-w-full items-center gap-1 rounded-md border pr-1 text-[12px] transition-colors md:inline-flex ${
        step.primary
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <Link
        href={step.href}
        title={detail}
        className={`flex min-w-0 items-center gap-2 px-2.5 py-1 transition-colors ${
          step.primary
            ? "hover:bg-primary/20 hover:text-foreground"
            : "hover:bg-accent hover:text-foreground"
        }`}
      >
        <Sparkles
          className={`size-3 shrink-0 ${step.primary ? "text-primary" : "text-muted-foreground"}`}
        />
        <span className="truncate font-medium">{label}</span>
        <span className="hidden truncate text-muted-foreground xl:inline">
          — {detail}
        </span>
        <ArrowRight className="size-3 shrink-0 opacity-60" />
      </Link>
      <NextStepDismissButton stepId={step.id} />
    </div>
  );
}

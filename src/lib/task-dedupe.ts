/**
 * Which generated tasks a project should not get, because another task
 * already says the same thing.
 *
 * Three generators fill a project's list: the starter templates (by
 * stack and niche), our own audit (`audit:<type>`) and the audit engine
 * (`seomator:<rule>`). The engine repeated most of what the audit found
 * ("Robots.txt Exists", "Sitemap Exists", the rendered H1 / description /
 * canonical) and raised every P2 and P3 rule as a task too, so a
 * one-page site opened on 68 tasks. The engine's finding-level filter
 * (dropCovered) compares page by page and misses the same problem
 * reported on two URLs (/robots.txt by one, / by the other); this works
 * on problem types instead.
 *
 * Pure: no database.
 */
import { ENGINE_EQUIVALENTS } from "./audit-engine";

/**
 * Engine rules that are never a task. "Use a single H1" is advice this
 * tool does not give (several H1s are valid HTML and Google says so; the
 * quick wins dropped `multiple_h1` for the same reason).
 */
const NEVER_A_TASK = new Set(["core-h1-single"]);

/** Equivalences dropCovered does not need but tasks do (rendered checks, the redirect). */
const EXTRA_EQUIVALENTS: Readonly<Record<string, readonly string[]>> = {
  "js-rendered-h1": ["missing_h1"],
  "js-rendered-description": ["missing_meta_description"],
  "js-rendered-canonical": ["missing_canonical"],
  "security-https-redirect": ["no_https"],
};

function ruleIdOf(type: string): string {
  return type.startsWith("seomator:") ? type.slice("seomator:".length) : type;
}

export function engineEquivalents(type: string): readonly string[] {
  const id = ruleIdOf(type);
  return [...(ENGINE_EQUIVALENTS[id] ?? []), ...(EXTRA_EQUIVALENTS[id] ?? [])];
}

/** "[P2] Rule name: fix on …" → "P2". Older engine tasks carry it only in the title. */
export function planPriorityFromTitle(title: string): string | null {
  return /^\[(P\d)\]/.exec(title)?.[1] ?? null;
}

/**
 * Whether an engine rule deserves a task: P0 or P1 only (P2 and P3 stay
 * in the audit report), never a rule on the do-not-advise list, and not
 * when our own audit already has an open task for the same problem.
 */
export function engineTaskWanted(
  task: { type: string; planPriority: string | null },
  openAuditTypes: ReadonlySet<string>,
): boolean {
  if (NEVER_A_TASK.has(ruleIdOf(task.type))) return false;
  if (task.planPriority !== "P0" && task.planPriority !== "P1") return false;
  return !engineEquivalents(task.type).some((t) => openAuditTypes.has(t));
}

/**
 * Generic starter templates that say exactly what an audit task says.
 * Platform-specific ones ("Enable HTTPS in Settings → Advanced → SSL")
 * are instructions, not duplicates, and are not listed... except the two
 * HTTPS ones, which are the whole job when the audit finds no HTTPS.
 */
export const TEMPLATE_AUDIT_EQUIVALENTS: Readonly<Record<string, string>> = {
  "Add canonical link tags to every page": "missing_canonical",
  "Generate and submit a sitemap.xml": "missing_sitemap",
  "Add JSON-LD schema for your business type": "missing_schema",
  "Enable HTTPS in Settings → Advanced → SSL": "no_https",
  "Enable site-wide HTTPS in Project Settings → Hosting": "no_https",
};

/** The audit type a starter template repeats, if any. */
export function templateAuditType(title: string): string | null {
  return TEMPLATE_AUDIT_EQUIVALENTS[title] ?? null;
}

/**
 * A generated task nobody has started: still to do, no time logged, not
 * assigned. Only these may be removed by a later run; anything a person
 * has touched stays.
 */
export function untouched(t: { status: string; actualMinutes: number | null; assignedUserId: number | null }): boolean {
  return t.status === "todo" && !t.actualMinutes && t.assignedUserId === null;
}

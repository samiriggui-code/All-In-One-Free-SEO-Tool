/**
 * Missions: what was agreed on a project (a client's site).
 *
 * Pure rules only, so they can be tested without a database: when a
 * mission may be created, and which one the audit points to. The reads
 * and writes are in projects.ts.
 */

import type { MissionKind } from "@/db/schema";

/** What the rules need to know about a project's audits. */
export type AuditFacts = {
  /** A completed full audit exists: the one a decision can rest on. */
  fullAuditDone: boolean;
  /** A completed quick audit exists: a first score, not a basis. */
  quickAuditDone: boolean;
  /** Score of the latest completed audit, 0 to 100. */
  score: number | null;
  /** Open findings of the latest completed audit, by severity. */
  critical: number;
  high: number;
  /** Pages the latest audit crawled; 0 means the site was unreachable. */
  pagesCrawled: number | null;
};

export type ProjectStage = "to_audit" | "auditing" | "audited";

/**
 * Every project starts with an audit. Until the full audit is done there
 * is nothing to build a strategy, a follow-up or a specification on, so no
 * mission can be created.
 */
export function projectStage(a: Pick<AuditFacts, "fullAuditDone" | "quickAuditDone">): ProjectStage {
  if (a.fullAuditDone) return "audited";
  return a.quickAuditDone ? "auditing" : "to_audit";
}

export function canCreateMission(a: Pick<AuditFacts, "fullAuditDone">): boolean {
  return a.fullAuditDone;
}

export type MissionSuggestion = {
  kind: MissionKind;
  /** Why, as a key into the `missions.reasons` messages. */
  reason: "unreachable" | "weak_site" | "many_fixable" | "healthy";
  /** A redesign is followed by monthly SEO on the new site. */
  then?: MissionKind;
};

/**
 * The mission the full audit points to. A suggestion: the agency decides,
 * and "audit only" is always available when the client wants nothing more.
 *
 *   score below 50, or the site could not be crawled  -> redesign, then monitoring
 *   score below 80, or any critical finding           -> the whole circuit
 *   otherwise                                         -> monthly monitoring
 *
 * The thresholds follow the report's own colours (below 50 red, below 80
 * amber), so the suggestion never contradicts what the client reads.
 */
export function suggestMission(a: AuditFacts): MissionSuggestion | null {
  if (!a.fullAuditDone || a.score === null) return null;
  if (a.pagesCrawled === 0) return { kind: "redesign", reason: "unreachable", then: "monitoring" };
  if (a.score < 50) return { kind: "redesign", reason: "weak_site", then: "monitoring" };
  if (a.score < 80 || a.critical > 0) return { kind: "full", reason: "many_fixable" };
  return { kind: "monitoring", reason: "healthy" };
}

/** Recurring missions have no end; the others are finished at some point. */
export function isRecurring(kind: MissionKind): boolean {
  return kind === "monitoring" || kind === "full";
}

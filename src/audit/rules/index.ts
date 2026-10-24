/**
 * Registers every rule. Each category module calls `registerRule` for its
 * rules on import, so importing this file is what loads the catalogue.
 */
import "@/audit/rules/accessibility";
import "@/audit/rules/content";
import "@/audit/rules/core";
import "@/audit/rules/crawlability";
import "@/audit/rules/eeat";
import "@/audit/rules/geo";
import "@/audit/rules/html";
import "@/audit/rules/i18n";
import "@/audit/rules/images";
import "@/audit/rules/javascript";
import "@/audit/rules/legal";
import "@/audit/rules/links";
import "@/audit/rules/mobile";
import "@/audit/rules/performance";
import "@/audit/rules/redirects";
import "@/audit/rules/schema";
import "@/audit/rules/security";
import "@/audit/rules/social";
import "@/audit/rules/technical";
import "@/audit/rules/url-structure";

import { getRuleCount } from "@/audit/engine/rule-registry";

/** Kept for the reference engine's call sites: registration already ran on import. */
export async function loadAllRules(): Promise<number> {
  return getRuleCount();
}

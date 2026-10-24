import { REPO_UA_SUFFIX } from "@/lib/repo";

/**
 * The audit crawler's User-Agent. Same bot name the rest of SEO Tool uses,
 * so a site owner reading their logs sees one crawler, not two.
 */
export const DEFAULT_USER_AGENT = `Mozilla/5.0 (compatible; SeoToolBot/1.0; ${REPO_UA_SUFFIX})`;
export const MOBILE_USER_AGENT = `Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 SeoToolBot/1.0 (${REPO_UA_SUFFIX})`;

export function getUserAgent(): string {
  return DEFAULT_USER_AGENT;
}

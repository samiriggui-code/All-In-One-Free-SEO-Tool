import "server-only";
import { getSetting } from "@/lib/settings-store";
import { DEFAULT_DISABLED } from "@/lib/tool-catalog";

/**
 * Tools turned off in Settings → Tools. Until the list has been saved
 * once, the tools marked offByDefault in the catalogue are off (paid key,
 * or outside SEO work); after that, the saved list is the whole truth.
 *
 * Turning a tool off hides it from the places that offer it (search, the
 * client's tool rail, Settings → Tools filters); the route keeps working,
 * so links in old reports and bookmarks do not break.
 */
export async function getDisabledTools(): Promise<ReadonlySet<string>> {
  const raw = await getSetting<unknown>("tools.disabled").catch(() => null);
  if (!Array.isArray(raw)) return new Set(DEFAULT_DISABLED);
  return new Set(raw.filter((h): h is string => typeof h === "string"));
}

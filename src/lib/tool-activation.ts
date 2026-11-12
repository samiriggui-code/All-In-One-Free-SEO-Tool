import "server-only";
import { getSetting } from "@/lib/settings-store";

/**
 * Tools turned off in Settings → Tools. Everything is on until someone
 * turns it off, so an empty list is the normal state.
 *
 * Turning a tool off hides it from the places that offer it (search, the
 * client's tool rail, Settings → Tools filters); the route keeps working,
 * so links in old reports and bookmarks do not break.
 */
export async function getDisabledTools(): Promise<ReadonlySet<string>> {
  const raw = await getSetting<unknown>("tools.disabled").catch(() => null);
  return new Set(Array.isArray(raw) ? raw.filter((h): h is string => typeof h === "string") : []);
}

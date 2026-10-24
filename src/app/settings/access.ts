import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@/db/schema";
import { accountsEnabled, canManageSettings, currentUser } from "@/lib/auth";

/**
 * The check every settings page runs for itself. The layout runs it too, but
 * a layout is not an authorization boundary: on a client navigation Next can
 * render a page without re-rendering the layout above it, so a page that
 * reads data must not rely on the layout having run.
 *
 * Signed-out sessions go to sign in, viewers go home. `owner` pages hold
 * secrets only the workspace owner may read (tokens, credentials), so other
 * roles are sent back to the settings index.
 */
export async function requireSettingsPage(
  path: string,
  { owner = false }: { owner?: boolean } = {},
): Promise<User | null> {
  const me = await currentUser();
  if (!me && accountsEnabled()) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (me?.role === "viewer") redirect("/");
  if (owner && me && !canManageSettings(me.role)) redirect("/settings");
  return me;
}

import { redirect } from "next/navigation";
import { accountsEnabled, currentUser } from "@/lib/auth";

/**
 * Every settings page, not just the index: client viewers are read-only
 * and have no business in workspace configuration. A session that no
 * longer resolves to a user (password changed, account disabled) is sent
 * to sign in again rather than read as a solo install.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await currentUser();
  if (!me && accountsEnabled()) redirect("/login?next=/settings");
  if (me?.role === "viewer") redirect("/");
  return children;
}

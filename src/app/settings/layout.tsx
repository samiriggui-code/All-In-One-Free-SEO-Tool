import { requireSettingsPage } from "./access";

/**
 * Every settings page, not just the index: client viewers are read-only
 * and have no business in workspace configuration. Each page also runs
 * this check itself (see ./access.ts); this keeps the shell from rendering
 * for them at all.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSettingsPage("/settings");
  return children;
}

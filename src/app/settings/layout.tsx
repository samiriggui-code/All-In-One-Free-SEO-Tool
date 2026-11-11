import { getTranslations } from "next-intl/server";
import { canManageSettings } from "@/lib/auth";
import { requireSettingsPage } from "./access";
import { SettingsNav } from "./settings-nav";
import { SettingsOverlay } from "./settings-overlay";
import "./settings-window.css";

/**
 * The settings window, built like GsKnora's: a centred modal over the
 * dimmed app, a grey rail of sections on the left, one section on the
 * right that scrolls on its own. Full-screen sheet on phones.
 *
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
  const me = await requireSettingsPage("/settings");
  const isOwner = !me || canManageSettings(me.role);
  const t = await getTranslations("settings");

  return (
    <SettingsOverlay closeLabel={t("close")}>
      <aside className="gsk-sidebar">
        <div className="gsk-sidebar-header">
          <h2 id="gsk-title" className="gsk-sidebar-title">
            {t("title")}
          </h2>
        </div>
        <SettingsNav isOwner={isOwner} />
      </aside>
      <div className="gsk-content">
        <div className="gsk-body">
          <div className="gsk-content-wrapper">{children}</div>
        </div>
      </div>
    </SettingsOverlay>
  );
}

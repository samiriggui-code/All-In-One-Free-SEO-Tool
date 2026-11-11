import { SearchPalette } from "./search-palette";
import { NotificationsBell } from "./notifications-bell";
import { AddClientButton } from "./add-client-button";
import { MobileNav } from "./mobile-nav";
import { AiUsagePill } from "./ai-usage-pill";
import { ProfileMenu } from "./profile-menu";
import { NextStep } from "./next-step";
import { ThemeToggle } from "./theme-toggle";
import type { ThemePreference } from "@/app/settings/theme-actions";

/**
 * The top bar: search, the next step and adding a client.
 *
 * The account menu, the bell and the theme live at the bottom of the
 * sidebar from md up (sidebar-footer.tsx, as in GsKnora); they stay here
 * only on phones, where the sidebar is hidden. The Guided / Pro switch is
 * gone: it no longer filters the menu, so it changed nothing.
 */
export async function TopBar({
  unreadByHref,
  theme = "system",
  userRole = null,
}: {
  unreadByHref?: Record<string, number>;
  theme?: ThemePreference;
  userRole?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 sm:px-4">
      <MobileNav unreadByHref={unreadByHref} userRole={userRole} />
      {/* A flex box, so the search button can shrink with it. As a block,
          the button kept the width of its own text and spilled under the
          next-step pill beside it. */}
      <div className="flex min-w-0 flex-1">
        <SearchPalette />
      </div>
      <div className="hidden min-w-0 shrink overflow-hidden lg:block">
        <NextStep />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <AiUsagePill />
        <AddClientButton />
        <div className="flex items-center gap-0.5 md:hidden">
          <ThemeToggle theme={theme} />
          <NotificationsBell />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { X } from "lucide-react";
import { canManageSettings } from "@/lib/auth";
import { requireSettingsPage } from "./access";
import { SettingsNav } from "./settings-nav";

/**
 * The settings window: a rail of sections on the left, one section on the
 * right that scrolls on its own. On phones the rail becomes a row of
 * sections above the content.
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
    <div className="page-shell md:h-[calc(100dvh-7.5rem)] md:min-h-[520px]">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:flex-row">
        <div className="flex shrink-0 flex-col md:w-60 md:border-r md:border-border md:bg-muted/30">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-lg font-semibold tracking-tight">{t("title")}</span>
            <Link
              href="/"
              aria-label={t("close")}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            >
              <X className="size-4" />
            </Link>
          </div>
          <SettingsNav isOwner={isOwner} />
        </div>

        <div className="relative min-w-0 flex-1 md:overflow-y-auto">
          <Link
            href="/"
            aria-label={t("close")}
            className="absolute right-4 top-4 z-10 hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:block"
          >
            <X className="size-5" />
          </Link>
          <div className="space-y-6 p-4 sm:p-6 md:px-8 md:py-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

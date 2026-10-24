import { Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Role } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";

/**
 * /settings for a manager or member. Workspace configuration is the
 * owner's, so this says who you are here and what that lets you do.
 */
export async function MemberSettings({ role }: { role: Role | null }) {
  const t = await getTranslations("settings.member");
  const tRoles = await getTranslations("auth.roles");
  const tDesc = await getTranslations("auth.roleDescriptions");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={SettingsIcon}
        accent="violet"
      />
      <section className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-500 ring-1 ring-violet-400/30 dark:text-violet-300">
            <ShieldCheck className="size-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("yourRole", { role: role ? tRoles(role) : "—" })}
            </p>
            {role && (
              <p className="text-sm text-muted-foreground">{tDesc(role)}</p>
            )}
            <p className="pt-2 text-sm text-muted-foreground">{t("ownerOnly")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

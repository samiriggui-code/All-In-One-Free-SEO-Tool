export const dynamic = "force-dynamic";

import { asc } from "drizzle-orm";
import { Users2 } from "lucide-react";
import { db } from "@/db/client";
import { clientMembers, clients, users } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { accountsEnabled, canManageTeam } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { pendingInvites } from "@/lib/invites";
import { TeamManager } from "./manager";
import { requireSettingsPage } from "../access";

export default async function TeamPage() {
  const me = await requireSettingsPage("/settings/team");
  const t = await getTranslations("settingsTeam");
  const crumbs = [{ href: "/settings", label: t("crumbSettings") }, { label: t("title") }];

  // Accounts are opt-in, so this page has a job to do before there is a
  // team: explain what turning them on gets you, and offer the switch.
  if (!accountsEnabled()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("title")}
          description={t("soloDescription")}
          icon={Users2}
          crumbs={crumbs}
        />
        <div className="glass-apple rounded-xl p-6">
          <p className="text-sm text-muted-foreground">
            {t("soloIntro")}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>· {t("soloPoint1")}</li>
            <li>· {t("soloPoint2")}</li>
            <li>· {t("soloPoint3")}</li>
            <li>· {t("soloPoint4")}</li>
          </ul>
          <p className="mt-4 text-sm">
            {/* Plain link: /register renders outside the app shell. */}
            <a
              href="/register"
              className="font-medium underline underline-offset-4"
            >
              {t("soloCta")}
            </a>{" "}
            <span className="text-muted-foreground">
              — {t("soloCtaHint")}
            </span>
          </p>
        </div>
      </div>
    );
  }

  const allUsers = db.select().from(users).orderBy(asc(users.id)).all();
  const allClients = db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .orderBy(asc(clients.name))
    .all();
  const assignments = db.select().from(clientMembers).all();
  const invites = pendingInvites();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          canManageTeam(me?.role ?? "member")
            ? t("ownerDescription")
            : t("memberDescription")
        }
        icon={Users2}
        crumbs={crumbs}
      />
      <TeamManager
        me={me ? { id: me.id, role: me.role } : null}
        users={allUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        }))}
        clients={allClients}
        assignments={assignments.map((a) => ({
          userId: a.userId,
          clientId: a.clientId,
        }))}
        invites={invites}
      />
    </div>
  );
}

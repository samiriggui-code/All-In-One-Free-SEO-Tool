import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { findInvite } from "@/lib/invites";
import { AccountForm } from "@/app/register/account-form";
import { AuthCard } from "@/components/auth/auth-card";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = findInvite(token);
  const t = await getTranslations("auth");

  if (!invite) {
    return (
      <AuthCard
        icon={<Clock className="size-5" />}
        title={t("inviteExpiredTitle")}
        subtitle={t("inviteExpiredBody")}
      >
        <a
          href="/login"
          className="inline-block text-sm underline underline-offset-2"
        >
          {t("goToSignIn")}
        </a>
      </AuthCard>
    );
  }

  return (
    <AccountForm
      token={token}
      lockedEmail={invite.email}
      heading={t("inviteHeading", { role: t(`roles.${invite.role}`) })}
      subheading={t(`roleDescriptions.${invite.role}`)}
      cta={t("inviteCta")}
    />
  );
}

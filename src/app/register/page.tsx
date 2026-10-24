import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { accountsEnabled } from "@/lib/auth";
import { AccountForm } from "./account-form";

/**
 * First-run account setup. Closes itself permanently the moment an owner
 * exists — after that, people arrive by invitation, and this page would
 * otherwise be an open registration form on a deployed instance.
 */
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (accountsEnabled()) redirect("/login");
  const t = await getTranslations("auth");

  return (
    <AccountForm
      heading={t("setupHeading")}
      subheading={t("setupSubheading")}
      cta={t("setupCta")}
    />
  );
}

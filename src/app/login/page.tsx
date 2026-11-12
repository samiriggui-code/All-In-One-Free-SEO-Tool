import { redirect } from "next/navigation";
import { accountsEnabled } from "@/lib/auth";
import { LoginForm } from "./login-form";

/**
 * Server shell, so the form knows which credentials to ask for before it
 * renders. Deciding this on the client would mean a fetch, a spinner,
 * and a form that changes shape underneath someone who has already
 * started typing — on the one screen where that is least forgivable.
 */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  // No account and no shared password: there is nobody to sign in as.
  // The first account is created on /register and becomes the owner.
  if (!accountsEnabled() && !process.env.APP_PASSWORD && process.env.SEO_ALLOW_OPEN_MODE !== "1") {
    redirect("/register");
  }
  return <LoginForm mode={accountsEnabled() ? "accounts" : "password"} />;
}

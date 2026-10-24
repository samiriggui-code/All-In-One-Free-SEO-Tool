"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/auth-card";

/**
 * Server messages the form knows how to say in the user's language. The
 * API answers in English (it is also called by scripts); anything not
 * listed here is shown as-is rather than hidden.
 */
const KNOWN_ERRORS: Record<string, string> = {
  "That doesn't look like an email address.": "errorEmail",
  "An account with that email already exists.": "errorExists",
  "This instance already has accounts. Ask the owner for an invite link.":
    "errorClosed",
  "That's longer than 200 characters.": "errorTooLong",
};

/**
 * Shared by /register (first user, becomes owner) and /invite/[token]
 * (invited user, role already decided). Same fields, same validation,
 * different framing — worth one component rather than two that drift.
 */
export function AccountForm({
  token,
  heading,
  subheading,
  lockedEmail,
  cta,
}: {
  token?: string;
  heading: string;
  subheading: string;
  /** Set for invites: the address is fixed by whoever sent the link. */
  lockedEmail?: string;
  cta: string;
}) {
  const t = useTranslations("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 10;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const raw: string | undefined = data?.error;
        const key = raw ? KNOWN_ERRORS[raw] : undefined;
        setError(key ? t(key) : (raw ?? t("createFailed")));
        return;
      }
      // Full load: the layout has to swap the auth frame for the app.
      window.location.assign("/");
    });
  }

  return (
    <AuthCard
      title={heading}
      subtitle={subheading}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("yourName")}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={t("namePlaceholder")}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={Boolean(lockedEmail)}
            autoComplete="username"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pwd">{t("password")}</Label>
          <Input
            id="pwd"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <p
            className={
              tooShort
                ? "text-[11px] text-amber-500 dark:text-amber-400"
                : "text-[11px] text-muted-foreground"
            }
          >
            {t("passwordHint")}
          </p>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-600 ring-1 ring-rose-500/30 dark:text-rose-300">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Button
          type="submit"
          disabled={pending || !email || password.length < 10}
          className="w-full"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("creating")}
            </>
          ) : (
            cta
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("haveAccount")}{" "}
          <a href="/login" className="underline underline-offset-2">
            {t("signIn")}
          </a>
        </p>
      </form>
    </AuthCard>
  );
}

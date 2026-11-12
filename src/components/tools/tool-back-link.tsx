"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

const CLASS =
  "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground";

/**
 * The link above a tool's title.
 *
 * Opened on its own, a tool points to the catalogue (Settings → Tools).
 * Opened for a project (`?clientId=`), it shows nothing: the shell draws
 * the way back to that project instead. This link used to lead to the
 * settings from everywhere, which took the reader out of the project.
 *
 * Nothing in the tool drawer (`?embed=1`): the drawer sits on the project
 * page and has its own close button.
 */
function BackLink() {
  const t = useTranslations("tools.common");
  const params = useSearchParams();
  if (params?.get("embed") === "1") return null;

  // Opened for a project: the shell shows the way back to it
  // (project-return-bar.tsx); one back link is enough.
  if (params?.get("clientId")) return null;
  return <Catalogue label={t("allTools")} />;
}

function Catalogue({ label }: { label: string }) {
  return (
    <Link href="/settings/tools" className={CLASS}>
      <ArrowLeft className="size-3 shrink-0" />
      {label}
    </Link>
  );
}

export function ToolBackLink() {
  const t = useTranslations("tools.common");
  // useSearchParams needs a boundary on statically rendered pages.
  return (
    <Suspense fallback={<Catalogue label={t("allTools")} />}>
      <BackLink />
    </Suspense>
  );
}

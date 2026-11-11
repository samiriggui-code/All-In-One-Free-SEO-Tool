import Link from "next/link";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

import { Users, Globe, Plus, Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shell/page-header";
import { ImportClientsButton } from "./import-form";
import { getGoogleConnectionStatus } from "@/lib/google-oauth";
import { clientScope } from "@/lib/client-scope";
import { auditFacts, listAccountsWithProjects } from "@/lib/projects";
import { ProjectList } from "./project-list";



export default async function ClientsPage() {
  const t = await getTranslations("clients");
  const tCommon = await getTranslations("common");
  const rows = await db.select().from(clients).where(await clientScope()).orderBy(desc(clients.createdAt));
  // Client -> projects (its sites) -> missions.
  const accounts = await listAccountsWithProjects();
  const facts = new Map(
    await Promise.all(
      accounts.flatMap((a) => a.projects).map(async (p) => [p.id, await auditFacts(p.id)] as const),
    ),
  );
  const googleStatus = await getGoogleConnectionStatus();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Users}
        accent="violet"
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {googleStatus.configured && (
              <Link
                href="/clients/import"
                className={buttonVariants({
                  variant: "outline",
                  className: "border-violet-500/30 bg-violet-500/10",
                })}
              >
                <Sparkles className="size-4" />
                {t("importGoogle")}
              </Link>
            )}
            <ImportClientsButton />
            <a
              href="/clients/export.csv"
              className={buttonVariants({
                variant: "outline",
                className: "border-white/10 bg-white/5",
              })}
            >
              {tCommon("exportCsv")}
            </a>
            <Link
              href="/clients/new"
              className={buttonVariants({
                className:
                  "shadow-lg shadow-violet-500/25 ring-1 ring-inset ring-white/15",
              })}
            >
              <Plus className="size-4" />
              {t("addClient")}
            </Link>
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-card/40 px-6 py-16 text-center backdrop-blur-md">
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-400/30">
              <Globe className="size-6 text-violet-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No clients yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {googleStatus.configured
                  ? "Easiest path: import every site in your Google account in one click. Or add manually."
                  : "Add your first one — we'll auto-fetch the logo, name, address, and social links from the URL."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {googleStatus.configured && (
                <Link
                  href="/clients/import"
                  className={buttonVariants({
                    className: "shadow-lg shadow-violet-500/25",
                  })}
                >
                  <Sparkles className="size-4" />
                  Import from Google
                </Link>
              )}
              <Link
                href="/clients/new"
                className={buttonVariants({
                  variant: googleStatus.configured ? "outline" : "default",
                  className: googleStatus.configured
                    ? "border-white/10 bg-white/5"
                    : "shadow-lg shadow-violet-500/25",
                })}
              >
                Add manually
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((a) => (
            <section key={a.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {a.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">
                      <Link href={`/clients/accounts/${a.id}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {t("projectCount", { count: a.projects.length })}
                      {a.email ? ` · ${a.email}` : ""}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/clients/new?account=${a.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Plus className="size-4" />
                  {t("addProject")}
                </Link>
              </header>
              <ProjectList projects={a.projects} facts={facts} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

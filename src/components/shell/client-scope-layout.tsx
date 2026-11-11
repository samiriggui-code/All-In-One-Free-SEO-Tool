import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { clientAccounts, clients } from "@/db/schema";
import { assertClientParam } from "@/lib/client-scope";
import { isLocalProject, projectTabs } from "@/lib/project-nav";
import { ProjectNav } from "./project-nav";

/**
 * The layout of every per-client page (the `c/[clientId]` folders, plus
 * `clients/[id]`). Two jobs:
 *
 * 1. Refuse requests for clients the signed-in user isn't assigned to. A
 *    layout rather than a call inside each page because a layout can't be
 *    forgotten: whoever adds the next per-client route gets the check by
 *    putting their page in the folder (client-scope-layouts.test.ts walks
 *    src/app to make sure). A helper you have to remember to call is a
 *    helper that eventually isn't called.
 *
 * 2. Draw the project's navigation above the page (project-nav.tsx), so
 *    every page of a project carries its tabs and stays in the project.
 *    Not inside the tool drawer (?embed=1): the drawer sits on the project
 *    page, which already shows them.
 *
 * Re-exported by a one-line `layout.tsx` in every per-client route
 * segment. Next.js has no way to express one layout across sibling route
 * trees, so the one-liners are the cost of the guarantee.
 */
export default async function ClientScopeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId?: string; id?: string }>;
}) {
  const p = await params;
  const raw = p.clientId ?? p.id;
  await assertClientParam(raw);

  const id = Number(raw);
  const embed = (await headers()).get("x-embed") === "1";
  const [project] =
    !embed && Number.isInteger(id)
      ? await db
          .select({
            id: clients.id,
            name: clients.name,
            url: clients.url,
            niche: clients.niche,
            gbpUrl: clients.gbpUrl,
            accountId: clients.accountId,
          })
          .from(clients)
          .where(eq(clients.id, id))
          .limit(1)
      : [];
  if (!project) return <>{children}</>;

  const [account] = project.accountId
    ? await db
        .select({ id: clientAccounts.id, name: clientAccounts.name })
        .from(clientAccounts)
        .where(eq(clientAccounts.id, project.accountId))
        .limit(1)
    : [];

  return (
    <>
      {/* useSearchParams (the project page's ?tab=) needs a boundary. */}
      <Suspense fallback={null}>
        <ProjectNav
          project={{ id: project.id, name: project.name, url: project.url }}
          account={account ?? null}
          tabs={projectTabs(project.id, { local: isLocalProject(project) })}
        />
      </Suspense>
      {children}
    </>
  );
}

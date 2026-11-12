export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { asc } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { AuthorAuthorityClient } from "./client";

export default async function AuthorAuthorityIndexPage() {
  const tx = await getTranslations("ui.app_author-authority_page");
  const all = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(await clientScope())
    .orderBy(asc(clients.name));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={tx("authorTopicAuthorityTracker")}
        description={tx("scanACompetitorOrPartner")}
        icon={Users}
        accent="cyan"
      />
      <AuthorAuthorityClient clients={all} />
    </div>
  );
}

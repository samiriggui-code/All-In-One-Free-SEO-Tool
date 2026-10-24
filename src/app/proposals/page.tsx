export const dynamic = "force-dynamic";

import { asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { FileSignature } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { clients, graderLeads, invoices, proposals, serviceOffers } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { clientScope } from "@/lib/client-scope";
import { currentUser, visibleClientIds } from "@/lib/auth";
import { ProposalsManager } from "./manager";

export default async function ProposalsPage() {
  const visible = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(await clientScope())
    .orderBy(asc(clients.name));

  const scope = await visibleClientIds(await currentUser());

  // Proposals attached to a client the caller can't see must not appear.
  // Ones with no client (built straight from a lead) are workspace-wide.
  const rows = await db
    .select()
    .from(proposals)
    .orderBy(desc(proposals.createdAt))
    .limit(100);
  const mine =
    scope === null
      ? rows
      : rows.filter((p) => p.clientId === null || scope.includes(p.clientId));

  // Leads worth pitching: someone left an email and hasn't been won yet.
  const leads = await db
    .select({
      id: graderLeads.id,
      url: graderLeads.url,
      name: graderLeads.name,
      email: graderLeads.email,
      score: graderLeads.score,
    })
    .from(graderLeads)
    .where(inArray(graderLeads.status, ["new", "contacted"]))
    .orderBy(desc(graderLeads.createdAt))
    .limit(50);

  const [t, catalogue, billed] = await Promise.all([
    getTranslations("proposals"),
    db
      .select()
      .from(serviceOffers)
      .where(eq(serviceOffers.active, true))
      .orderBy(asc(serviceOffers.position), asc(serviceOffers.id)),
    db
      .select({ id: invoices.id, proposalId: invoices.proposalId })
      .from(invoices)
      .where(isNotNull(invoices.proposalId)),
  ]);
  const invoiceOf = new Map(billed.map((b) => [b.proposalId, b.id]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={FileSignature}
        accent="violet"
      />
      <ProposalsManager
        catalogue={catalogue.map((o) => ({
          offerId: o.id,
          name: o.name,
          kind: o.kind,
          billing: o.billing,
          summary: o.summary ?? "",
          deliverables: o.deliverables,
          estimatedHours: o.estimatedHours,
          duration: o.duration,
          price: o.price,
        }))}
        clients={visible}
        leads={leads.filter((l) => l.email)}
        proposals={mine.map((p) => ({
          id: p.id,
          clientId: p.clientId,
          prospectName: p.prospectName,
          prospectUrl: p.prospectUrl,
          title: p.title,
          intro: p.intro,
          terms: p.terms,
          currency: p.currency,
          scope: p.scopeJson ?? [],
          pricing: p.pricingJson ?? [],
          offers: p.offersJson ?? [],
          quote: p.quoteJson ?? null,
          invoiceId: invoiceOf.get(p.id) ?? null,
          status: p.status,
          basedOnScore: p.basedOnScore,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

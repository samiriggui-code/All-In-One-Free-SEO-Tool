import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, inArray } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { db } from "@/db/client";
import { clients, invoices, proposals } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { mayEdit } from "@/lib/auth";
import { formatMoney, invoiceTotals } from "@/lib/invoice-utils";
import { auditFacts, visibleAccount } from "@/lib/projects";
import { ProjectList } from "../../project-list";
import { AccountContact } from "./account-contact";

export const dynamic = "force-dynamic";

/**
 * The client, i.e. the company (client_accounts): who to talk to, what was
 * invoiced and quoted across all its sites, each site's portal, and the
 * sites themselves. A project page (/clients/[id]) is one site; this is
 * the level above it. Invoices and proposals belong to projects, so they
 * are gathered here from every project the signed-in user may see.
 */
export default async function ClientAccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const account = await visibleAccount(Number(accountId));
  if (!account) notFound();

  const t = await getTranslations("clientAccount");
  const tc = await getTranslations("clients");
  const ti = await getTranslations("invoices");
  const tp = await getTranslations("proposals");
  const locale = await getLocale();
  const ids = account.projects.map((p) => p.id);
  const projectName = new Map(account.projects.map((p) => [p.id, p.name]));

  const [facts, invoiceRows, proposalRows, portalRows, canEdit] = await Promise.all([
    Promise.all(account.projects.map(async (p) => [p.id, await auditFacts(p.id)] as const)).then((e) => new Map(e)),
    db
      .select({
        id: invoices.id,
        number: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        items: invoices.items,
        currency: invoices.currency,
        taxRate: invoices.taxRate,
        projectId: invoices.clientId,
      })
      .from(invoices)
      .where(inArray(invoices.clientId, ids))
      .orderBy(desc(invoices.issueDate)),
    db
      .select({
        id: proposals.id,
        title: proposals.title,
        status: proposals.status,
        createdAt: proposals.createdAt,
        projectId: proposals.clientId,
      })
      .from(proposals)
      .where(inArray(proposals.clientId, ids))
      .orderBy(desc(proposals.createdAt)),
    db.select({ id: clients.id, shareToken: clients.shareToken }).from(clients).where(inArray(clients.id, ids)),
    mayEdit(),
  ]);

  // Totals per currency: a client billed in two currencies gets two
  // figures rather than one meaningless sum.
  const totals = new Map<string, { paid: number; due: number }>();
  for (const r of invoiceRows) {
    if (r.status === "draft" || r.status === "void") continue;
    const sum = totals.get(r.currency) ?? { paid: 0, due: 0 };
    const { total } = invoiceTotals(r.items, r.taxRate);
    if (r.status === "paid") sum.paid += total;
    else sum.due += total;
    totals.set(r.currency, sum);
  }
  const money = (n: number, currency: string) => formatMoney(n, currency, locale);
  const day = (d: Date | null) => (d ? d.toLocaleDateString(locale, { dateStyle: "medium" }) : "—");
  const invoiceTone: Record<string, string> = {
    draft: "gsk-tag--default",
    sent: "gsk-tag--brand",
    paid: "gsk-tag--success",
    overdue: "gsk-tag--warning",
    void: "gsk-tag--default",
  };
  const proposalTone: Record<string, string> = {
    draft: "gsk-tag--default",
    sent: "gsk-tag--brand",
    accepted: "gsk-tag--success",
    declined: "gsk-tag--default",
  };
  const portals = new Map(portalRows.map((r) => [r.id, r.shareToken]));

  const block = "gsk-block rounded-2xl border border-border bg-card";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        title={account.name}
        description={t("description", { count: account.projects.length })}
        icon={Building2}
        crumbs={[{ label: tc("title"), href: "/clients" }, { label: account.name }]}
        actions={
          canEdit ? (
            <Link href={`/clients/new?account=${account.id}`} className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" />
              {tc("addProject")}
            </Link>
          ) : null
        }
      />

      <AccountContact
        canEdit={canEdit}
        account={{
          id: account.id,
          name: account.name,
          contactName: account.contactName,
          email: account.email,
          phone: account.phone,
          address: account.address,
          notes: account.notes,
        }}
      />

      {/* Projects */}
      <section className={`${block} overflow-hidden`}>
        <div className="gsk-block-head px-5 pt-4">
          <h2 className="gsk-block-title">{t("projects.title")}</h2>
          <p className="gsk-block-description">{t("projects.description")}</p>
        </div>
        <div className="border-t border-border">
          <ProjectList projects={account.projects} facts={facts} />
        </div>
      </section>

      {/* Billing */}
      <section className={`${block} px-5 py-4`}>
        <div className="gsk-block-head gsk-block-head--action">
          <div>
            <h2 className="gsk-block-title">{t("billing.title")}</h2>
            <p className="gsk-block-description">{t("billing.description")}</p>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href="/proposals" className="gsk-btn">
                {t("billing.newProposal")}
              </Link>
              <Link href="/invoices/new" className="gsk-btn">
                {ti("new")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="gsk-row">
          <div className="gsk-row-info">
            <span className="gsk-row-label">{t("billing.paid")}</span>
          </div>
          <div className="gsk-row-control gsk-value">
            {totals.size === 0 ? (
              <span className="gsk-value--muted">—</span>
            ) : (
              [...totals].map(([cur, s]) => money(s.paid, cur)).join(" · ")
            )}
          </div>
        </div>
        <div className="gsk-row">
          <div className="gsk-row-info">
            <span className="gsk-row-label">{t("billing.due")}</span>
            <p className="gsk-row-desc">{t("billing.dueHint")}</p>
          </div>
          <div className="gsk-row-control gsk-value">
            {totals.size === 0 ? (
              <span className="gsk-value--muted">—</span>
            ) : (
              [...totals].map(([cur, s]) => money(s.due, cur)).join(" · ")
            )}
          </div>
        </div>

        <h3 className="mt-5 mb-2 text-sm font-semibold">{t("billing.invoices")}</h3>
        {invoiceRows.length === 0 ? (
          <p className="gsk-note">{t("billing.noInvoices")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{ti("columns.number")}</th>
                  <th className="py-2 pr-3 font-medium">{t("billing.project")}</th>
                  <th className="py-2 pr-3 font-medium">{ti("columns.issued")}</th>
                  <th className="py-2 pr-3 font-medium">{ti("columns.due")}</th>
                  <th className="py-2 pr-3 font-medium">{ti("columns.status")}</th>
                  <th className="py-2 text-right font-medium">{ti("columns.total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoiceRows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/invoices/${r.id}`} className="gsk-link font-mono text-[13px]">
                        {r.number}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{projectName.get(r.projectId) ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{day(r.issueDate)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{day(r.dueDate)}</td>
                    <td className="py-2 pr-3">
                      <span className={`gsk-tag ${invoiceTone[r.status]}`}>{ti(`status.${r.status}`)}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(invoiceTotals(r.items, r.taxRate).total, r.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mt-5 mb-2 text-sm font-semibold">{t("billing.proposals")}</h3>
        {proposalRows.length === 0 ? (
          <p className="gsk-note">{t("billing.noProposals")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {proposalRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                <Link href={`/proposals/${r.id}`} className="gsk-link min-w-0 flex-1 truncate">
                  {r.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {r.projectId ? projectName.get(r.projectId) : "—"} · {day(r.createdAt)}
                </span>
                <span className={`gsk-tag ${proposalTone[r.status]}`}>{tp(`status.${r.status}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Client portal */}
      <section className={`${block} px-5 py-4`}>
        <div className="gsk-block-head">
          <h2 className="gsk-block-title">{t("portal.title")}</h2>
          <p className="gsk-block-description">{t("portal.description")}</p>
        </div>
        {account.projects.map((p) => {
          const token = portals.get(p.id);
          return (
            <div key={p.id} className="gsk-row">
              <div className="gsk-row-info">
                <span className="gsk-row-label">{p.name}</span>
                <p className="gsk-row-desc">{p.url.replace(/^https?:\/\//, "")}</p>
              </div>
              <div className="gsk-row-control gsk-value">
                {token ? (
                  <>
                    <span className="gsk-tag gsk-tag--success">{t("portal.active")}</span>
                    <a href={`/portal/${token}`} target="_blank" rel="noreferrer" className="gsk-btn gsk-btn--sm">
                      <ExternalLink className="size-3.5" />
                      {t("portal.open")}
                    </a>
                  </>
                ) : (
                  <span className="gsk-tag gsk-tag--default">{t("portal.inactive")}</span>
                )}
                <Link href={`/clients/${p.id}?tab=settings`} className="gsk-btn gsk-btn--sm">
                  {t("portal.manage")}
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

import Link from "next/link";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

import { Receipt, Plus } from "lucide-react";
import { db } from "@/db/client";
import { clients, invoices } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getLocale, getTranslations } from "next-intl/server";
import { invoiceTotals, formatMoney } from "@/lib/invoice-utils";

const statusTone: Record<string, string> = {
  draft: "bg-white/5 text-muted-foreground ring-white/10",
  sent: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  overdue: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  void: "bg-white/5 text-muted-foreground ring-white/10",
};

export default async function InvoicesPage() {
  const t = await getTranslations("invoices");
  const locale = await getLocale();
  const money = (n: number, currency: string) => formatMoney(n, currency, locale);
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
      items: invoices.items,
      currency: invoices.currency,
      taxRate: invoices.taxRate,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.issueDate));

  const totals = {
    paid: 0,
    outstanding: 0,
    draft: 0,
  };
  for (const r of rows) {
    const { total } = invoiceTotals(r.items, r.taxRate);
    if (r.status === "paid") totals.paid += total;
    else if (r.status === "draft" || r.status === "void") totals.draft += total;
    else totals.outstanding += total;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Receipt}
        accent="amber"
        actions={
          <Link
            href="/invoices/new"
            className={buttonVariants({
              className:
                "shadow-lg shadow-amber-500/25 ring-1 ring-inset ring-white/15",
            })}
          >
            <Plus className="size-4" />
            {t("new")}
          </Link>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
              {t("totals.paid", { amount: money(totals.paid, "EUR") })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300 ring-1 ring-inset ring-amber-500/20">
              {t("totals.outstanding", { amount: money(totals.outstanding, "EUR") })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-muted-foreground ring-1 ring-inset ring-white/10">
              {t("totals.draft", { amount: money(totals.draft, "EUR") })}
            </span>
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
          <EmptyState
            icon={Receipt}
            title={t("empty.title")}
            body={t("empty.body")}
            primary={{ href: "/invoices/new", label: t("empty.cta") }}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-card/40 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">{t("columns.number")}</th>
                <th className="px-5 py-3 text-left font-medium">{t("columns.client")}</th>
                <th className="px-5 py-3 text-left font-medium">{t("columns.issued")}</th>
                <th className="px-5 py-3 text-left font-medium">{t("columns.due")}</th>
                <th className="px-5 py-3 text-left font-medium">{t("columns.status")}</th>
                <th className="px-5 py-3 text-right font-medium">{t("columns.total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => {
                const { total } = invoiceTotals(r.items, r.taxRate);
                return (
                  <tr
                    key={r.id}
                    className="group transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/invoices/${r.id}`}
                        className="font-medium font-mono text-xs group-hover:underline"
                      >
                        {r.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {r.clientName && r.clientId ? (
                        <Link
                          href={`/clients/${r.clientId}`}
                          className="text-foreground/90 hover:underline"
                        >
                          {r.clientName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {r.issueDate.toLocaleDateString(locale)}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {r.dueDate?.toLocaleDateString(locale) ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusTone[r.status]}`}
                      >
                        {t(`status.${r.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono">
                      {money(total, r.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

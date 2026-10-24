"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db/client";
import { clients, proposals } from "@/db/schema";
import { totals } from "@/lib/quote";
import { cartLines, cartOffers, cartQuote, checkCart } from "@/lib/quote-cart";
import { cartInputFor } from "./quote-data";

export type AcceptQuoteResult =
  | { ok: true }
  | { ok: false; error: "notFound" | "answered" | "offers" | "choice" | "severities" | "invalid" };

const argsSchema = z.object({
  token: z.string().min(16).max(200),
  proposalId: z.number().int().positive(),
});

const cartSchema = z.object({
  offerIds: z.array(z.number().int()).max(40),
  severities: z.array(z.enum(["critical", "high", "medium", "low"])).max(4),
});

/**
 * The client accepts their quote from the portal, with what they picked.
 *
 * Only the selection is sent. The lines are priced again here from the
 * stored proposal and the live catalogue, so what gets saved is what
 * the agency's own numbers say, whatever the browser claimed.
 *
 * Accepting is the same step as setting the status to "accepted" in
 * the app: the plan becomes tasks, and the agency can bill it.
 */
export async function acceptQuote(
  token: string,
  proposalId: number,
  rawCart: unknown,
): Promise<AcceptQuoteResult> {
  // Server actions take whatever the browser sends: check the types
  // before any of it reaches a query.
  if (!argsSchema.safeParse({ token, proposalId }).success) return { ok: false, error: "invalid" };
  const parsed = cartSchema.safeParse(rawCart);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const cart = parsed.data;

  const [client] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.shareToken, token))
    .limit(1);
  if (!client) return { ok: false, error: "notFound" };

  const [p] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.clientId, client.id)))
    .limit(1);
  if (!p) return { ok: false, error: "notFound" };
  if (p.status !== "sent") return { ok: false, error: "answered" };

  const input = await cartInputFor(p);
  const problem = checkCart(input, cart);
  if (problem) return { ok: false, error: problem };

  const t = await getTranslations("proposals");
  const money = moneyIn(p.currency, await getLocale());
  const pricing = cartLines(input, cart, {
    perMonth: t("perMonth"),
    hoursAt: (hours, rate) => t("hoursAt", { hours, rate: money(rate) }),
  });

  // Conditional on still being "sent": two clicks, or the agency
  // changing the status at the same moment, accept it once.
  const updated = await db
    .update(proposals)
    .set({
      offersJson: cartOffers(input, cart),
      quoteJson: cartQuote(input, cart),
      pricingJson: pricing,
      status: "accepted",
      updatedAt: new Date(),
    })
    .where(and(eq(proposals.id, p.id), eq(proposals.status, "sent")))
    .returning({ id: proposals.id });
  if (updated.length === 0) return { ok: false, error: "answered" };

  try {
    const { materialisePlan } = await import("@/lib/plan-tasks");
    await materialisePlan(p.id);
  } catch {
    // Same as accepting from the app: the plan can be expanded later.
  }

  try {
    const { notify } = await import("@/lib/notifier");
    const sum = totals(pricing);
    const tp = await getTranslations("portal.quote");
    await notify({
      title: tp("notifyTitle", { client: client.name }),
      body: p.title,
      level: "success",
      fields: [
        { label: tp("notifyOnce"), value: money(sum.once) },
        ...(sum.monthly > 0 ? [{ label: tp("notifyMonthly"), value: money(sum.monthly) }] : []),
      ],
    });
  } catch {
    // A webhook that is down must not undo the client's answer.
  }

  revalidatePath(`/portal/${token}`);
  revalidatePath("/proposals");
  return { ok: true };
}

/** Whole amounts in the proposal's own currency, as the page shows them. */
function moneyIn(currency: string, locale: string) {
  return (n: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${n} ${currency}`;
    }
  };
}

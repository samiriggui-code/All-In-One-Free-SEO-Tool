import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { proposals, serviceOffers, type Proposal } from "@/db/schema";
import { DEFAULT_QUOTE } from "@/lib/quote";
import type { CartInput } from "@/lib/quote-cart";
import { offerSnapshot } from "@/lib/service-offers";

/**
 * The quote a client can act on in their portal: the latest proposal
 * the agency has sent them and they have not answered yet.
 *
 * Drafts stay private. Setting a proposal to "sent" is what puts it in
 * the portal, the same step that already meant "the client has it".
 */
export async function openQuoteFor(clientId: number): Promise<Proposal | null> {
  const [row] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.clientId, clientId), eq(proposals.status, "sent")))
    .orderBy(desc(proposals.sentAt), desc(proposals.id))
    .limit(1);
  return row ?? null;
}

/** Everything the cart needs for one proposal, add-ons included. */
export async function cartInputFor(p: Proposal): Promise<CartInput> {
  const offers = p.offersJson ?? [];
  const inQuote = new Set(offers.map((o) => o.offerId));
  const catalogue = await db
    .select()
    .from(serviceOffers)
    .where(eq(serviceOffers.active, true))
    .orderBy(asc(serviceOffers.position), asc(serviceOffers.id));
  return {
    scope: p.scopeJson ?? [],
    quote: p.quoteJson ?? DEFAULT_QUOTE,
    pricing: p.pricingJson ?? [],
    offers,
    // A formula already in the quote is not offered a second time as an
    // add-on. With alternatives, the others are reached by picking them.
    addons: catalogue.filter((o) => !inQuote.has(o.id)).map(offerSnapshot),
  };
}

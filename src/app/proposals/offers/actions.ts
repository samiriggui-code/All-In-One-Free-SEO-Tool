"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db/client";
import { serviceOffers } from "@/db/schema";
import { accountsEnabled, canEdit, currentUser } from "@/lib/auth";
import { workItemDefaults } from "@/lib/proposal-scope";
import { defaultOffers } from "@/lib/service-offers";
import { setSetting } from "@/lib/settings-store";

export type OfferActionResult = { ok: true } | { ok: false; error: "readOnly" | "invalid" | "notFound" };

/** The catalogue is workspace-wide, so editing it needs edit rights, not a client. */
async function denied(): Promise<boolean> {
  const me = await currentUser();
  if (!me) return accountsEnabled();
  return !canEdit(me.role);
}

const offerSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["one_off", "monthly"]),
  billing: z.enum(["flat", "hourly"]),
  summary: z.string().trim().max(1000),
  deliverables: z.array(z.string().trim().min(1).max(300)).max(30),
  estimatedHours: z.number().int().min(0).max(10_000),
  duration: z.number().int().min(0).max(1000),
  price: z.number().int().min(0).max(10_000_000),
  active: z.boolean(),
});

export type OfferInput = z.input<typeof offerSchema>;

export async function saveOffer(input: OfferInput): Promise<OfferActionResult> {
  await requireSignedIn();
  if (await denied()) return { ok: false, error: "readOnly" };
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, ...values } = parsed.data;

  if (id) {
    const updated = await db
      .update(serviceOffers)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(serviceOffers.id, id))
      .returning({ id: serviceOffers.id });
    if (updated.length === 0) return { ok: false, error: "notFound" };
  } else {
    const existing = await db.select({ id: serviceOffers.id }).from(serviceOffers);
    await db.insert(serviceOffers).values({ ...values, position: existing.length });
  }
  revalidatePath("/proposals/offers");
  revalidatePath("/proposals");
  return { ok: true };
}

export async function deleteOffer(id: number): Promise<OfferActionResult> {
  await requireSignedIn();
  if (await denied()) return { ok: false, error: "readOnly" };
  if (!Number.isInteger(id)) return { ok: false, error: "invalid" };
  // Proposals keep their own copy of the service, so deleting it here
  // never changes a quote that was already written.
  await db.delete(serviceOffers).where(eq(serviceOffers.id, id));
  revalidatePath("/proposals/offers");
  revalidatePath("/proposals");
  return { ok: true };
}

/** Fill an empty catalogue with the starter services, in the app's language. */
export async function loadStarterOffers(): Promise<OfferActionResult> {
  await requireSignedIn();
  if (await denied()) return { ok: false, error: "readOnly" };
  const existing = await db
    .select({ id: serviceOffers.id })
    .from(serviceOffers)
    .orderBy(asc(serviceOffers.position));
  if (existing.length > 0) return { ok: true };
  const offers = defaultOffers(await getLocale());
  await db.insert(serviceOffers).values(
    offers.map((o, position) => ({
      name: o.name,
      kind: o.kind,
      billing: o.billing,
      summary: o.summary,
      deliverables: o.deliverables,
      estimatedHours: o.estimatedHours,
      duration: o.duration,
      price: o.price,
      position,
    })),
  );
  revalidatePath("/proposals/offers");
  revalidatePath("/proposals");
  return { ok: true };
}

const ratesSchema = z.object({
  hourlyRate: z.number().int().min(0).max(10_000),
  minutes: z.record(z.string().max(40), z.number().int().min(0).max(4800)),
});

/**
 * The hourly rate and the time per fix type, used for new quotes.
 *
 * Existing proposals keep the values they were written with.
 */
export async function saveQuoteRates(input: z.input<typeof ratesSchema>): Promise<OfferActionResult> {
  await requireSignedIn();
  if (await denied()) return { ok: false, error: "readOnly" };
  const parsed = ratesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const known = new Set(workItemDefaults().map((w) => w.key));
  const minutes = Object.fromEntries(
    Object.entries(parsed.data.minutes).filter(([k]) => known.has(k)),
  );
  await setSetting("quote.hourly_rate", parsed.data.hourlyRate);
  await setSetting("quote.minutes", minutes);
  revalidatePath("/proposals/offers");
  return { ok: true };
}

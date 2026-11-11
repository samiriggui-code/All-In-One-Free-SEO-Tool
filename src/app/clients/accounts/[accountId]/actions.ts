"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { clientAccounts } from "@/db/schema";
import { requireClientAccess } from "@/lib/auth";
import { visibleAccount } from "@/lib/projects";

const optional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : null));

const contactInput = z.object({
  accountId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  contactName: optional,
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "email" }),
  phone: optional,
  address: optional,
  notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type SaveContactResult = { ok: true } | { ok: false; field: "name" | "email" | "access" | "other" };

/**
 * The client's (company's) contact details.
 *
 * A client has no access rule of its own: its projects do. Whoever may
 * edit one of its projects may edit the company it belongs to, and nobody
 * else; an account with no visible project reads as not found.
 */
export async function saveAccountContact(
  _prev: SaveContactResult | null,
  formData: FormData,
): Promise<SaveContactResult> {
  await requireSignedIn();
  const parsed = contactInput.safeParse({
    accountId: formData.get("accountId"),
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? undefined,
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    address: formData.get("address") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    return { ok: false, field: path === "name" || path === "email" ? path : "other" };
  }
  const account = await visibleAccount(parsed.data.accountId);
  if (!account || account.projects.length === 0) return { ok: false, field: "access" };
  await requireClientAccess(account.projects[0].id, { edit: true });

  const { accountId, ...values } = parsed.data;
  await db
    .update(clientAccounts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(clientAccounts.id, accountId));
  revalidatePath(`/clients/accounts/${accountId}`);
  revalidatePath("/clients");
  return { ok: true };
}

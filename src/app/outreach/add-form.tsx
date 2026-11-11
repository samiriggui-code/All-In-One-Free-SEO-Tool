"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addOutreachContact, type AddContactResult } from "./actions";

export function AddOutreachForm({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    AddContactResult | null,
    FormData
  >(addOutreachContact, null);
  const t = useTranslations("linksTab.outreach.addForm");

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-card/40 p-5 text-sm text-muted-foreground backdrop-blur-md">
        {t("noClients")}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md"
    >
      <div className="grid gap-3 md:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">{t("client")}</Label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={clients[0].id}
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 py-1 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" placeholder={t("namePlaceholder")} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" placeholder={t("emailPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">{t("website")}</Label>
          <Input id="website" name="website" placeholder={t("websitePlaceholder")} />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={pending}
            className="w-full shadow-md shadow-violet-500/20"
          >
            <Plus className="size-4" />
            {pending ? t("adding") : t("add")}
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Input
          id="notes"
          name="notes"
          placeholder={t("notesPlaceholder")}
          maxLength={500}
        />
      </div>
      {state && !state.ok && (
        <p className="mt-3 text-xs text-rose-300">{state.error}</p>
      )}
    </form>
  );
}

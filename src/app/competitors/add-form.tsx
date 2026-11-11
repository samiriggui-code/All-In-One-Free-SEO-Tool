"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCompetitor, type AddCompetitorResult } from "./actions";

export function AddCompetitorForm({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    AddCompetitorResult | null,
    FormData
  >(addCompetitor, null);
  const t = useTranslations("keywordsTab.competitors.form");

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
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
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
          <Label htmlFor="url">{t("url")}</Label>
          <Input id="url" name="url" placeholder={t("urlPlaceholder")} required />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="shadow-lg shadow-violet-500/25 ring-1 ring-inset ring-white/15"
        >
          <Plus className="size-4" />
          {pending ? t("adding") : t("add")}
        </Button>
      </div>
      {state && !state.ok && (
        <p className="mt-3 text-xs text-rose-300">{state.error}</p>
      )}
    </form>
  );
}

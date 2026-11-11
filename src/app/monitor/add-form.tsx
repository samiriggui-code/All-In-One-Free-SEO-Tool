"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMonitoredPage, type AddMonitorResult } from "./actions";

export function AddMonitorForm({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    AddMonitorResult | null,
    FormData
  >(addMonitoredPage, null);
  const t = useTranslations("auditTab.monitor");

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-card/40 p-5 text-sm text-muted-foreground backdrop-blur-md">
        {t("form.noClients")}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md"
    >
      {/* Inside a project (one client passed) the page already says which
          site this is: no picker, the id rides along hidden. */}
      {clients.length === 1 ? <input type="hidden" name="clientId" value={clients[0].id} /> : null}
      <div
        className={`grid gap-3 md:items-end ${
          clients.length === 1 ? "md:grid-cols-[1fr_1fr_auto]" : "md:grid-cols-[auto_1fr_1fr_auto]"
        }`}
      >
        {clients.length > 1 ? (
          <div className="space-y-1.5">
            <Label htmlFor="clientId">{t("form.client")}</Label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={clients[0].id}
              className="flex h-9 min-w-[10rem] rounded-md border border-white/10 bg-card/60 px-3 py-1 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="url">{t("form.url")}</Label>
          <Input
            id="url"
            name="url"
            placeholder={t("form.urlPlaceholder")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="label">{t("form.label")}</Label>
          <Input
            id="label"
            name="label"
            placeholder={t("form.labelPlaceholder")}
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="shadow-md shadow-fuchsia-500/20"
        >
          <Plus className="size-4" />
          {pending ? t("form.adding") : t("form.submit")}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("form.hint")}
      </p>
      {state && !state.ok && (
        <p className="mt-2 text-xs text-rose-300">{state.error}</p>
      )}
    </form>
  );
}

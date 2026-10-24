"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Loader2,
  Plug,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GoogleSetupDialog } from "@/components/shell/google-setup-dialog";
import {
  fetchGoogleProperties,
  saveGoogleProperties,
} from "./google-actions";

type Status = {
  configured: boolean;
  connected: boolean;
  credentialsSet: boolean;
  credentialsFromEnv: boolean;
  email: string | null;
};

export function ClientGooglePanel({
  clientId,
  initialGsc,
  initialGa4,
  status: statusProp,
  redirectUri,
  initialClientId,
  hasSecret,
}: {
  clientId: number;
  initialGsc: string | null;
  initialGa4: string | null;
  status: Status;
  redirectUri: string;
  initialClientId: string | null;
  hasSecret: boolean;
}) {
  const t = useTranslations("clientPage.google");
  const [status, setStatus] = useState<Status>(statusProp);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gsc, setGsc] = useState(initialGsc ?? "");
  const [ga4, setGa4] = useState(initialGa4 ?? "");
  const [gscOptions, setGscOptions] = useState<
    { siteUrl: string; permissionLevel: string }[]
  >([]);
  const [ga4Options, setGa4Options] = useState<
    { id: string; displayName: string; accountName: string }[]
  >([]);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const canFetch = status.configured;

  useEffect(() => {
    if (!canFetch) return;
    const timer = setTimeout(() => {
      startLoading(async () => {
        const r = await fetchGoogleProperties();
        if (!r.ok) {
          setMessage({ tone: "error", text: r.error });
          return;
        }
        setGscOptions(r.gsc);
        setGa4Options(r.ga4);
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [canFetch]);

  function save() {
    startSaving(async () => {
      const result = await saveGoogleProperties({
        clientId,
        gscProperty: gsc || null,
        ga4PropertyId: ga4 || null,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({ tone: "success", text: t("saved") });
    });
  }

  // Not connected: show CTA that opens dialog inline
  if (!status.configured) {
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <div className="flex-1 space-y-1">
              <div className="font-medium text-amber-200">
                {t("notConnected")}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.rich("notConnectedBody", {
                  em: (chunks) => <em>{chunks}</em>,
                  b: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Sparkles className="size-4" />
            {t("connect")}
          </Button>
        </div>
        <GoogleSetupDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initialStatus={status}
          redirectUri={redirectUri}
          initialClientId={initialClientId}
          hasSecret={hasSecret}
          onConnected={(email) => {
            setStatus((s) => ({
              ...s,
              configured: true,
              connected: true,
              credentialsSet: true,
              email,
            }));
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-[12px] text-muted-foreground">
        <span className="font-medium text-violet-200">{t("perClientLabel")}</span>{" "}
        {t("perClientBody")}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <PropertyPicker
          label={t("gscLabel")}
          icon={Plug}
          value={gsc}
          onChange={setGsc}
          loading={loading}
          options={gscOptions.map((o) => ({
            value: o.siteUrl,
            label: `${o.siteUrl} (${o.permissionLevel.replace("siteOwner", t("permOwner")).replace("siteFullUser", t("permFull")).replace("siteRestrictedUser", t("permRestricted"))})`,
          }))}
          help={t("gscHelp")}
        />
        <PropertyPicker
          label={t("ga4Label")}
          icon={Database}
          value={ga4}
          onChange={setGa4}
          loading={loading}
          options={ga4Options.map((o) => ({
            value: o.id,
            label: `${o.displayName} · ${o.accountName} (${o.id})`,
          }))}
          help={t("ga4Help")}
        />
      </div>

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-xs ring-1 ring-inset ${
            message.tone === "success"
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              {t("save")}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            startLoading(async () => {
              const r = await fetchGoogleProperties();
              if (!r.ok) {
                setMessage({ tone: "error", text: r.error });
                return;
              }
              setGscOptions(r.gsc);
              setGa4Options(r.ga4);
              setMessage({ tone: "success", text: t("refreshed") });
            });
          }}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>
    </div>
  );
}

function PropertyPicker({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  loading,
  help,
}: {
  label: string;
  icon: typeof Plug;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  loading: boolean;
  help: string;
}) {
  const t = useTranslations("clientPage.google");
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
      >
        <option value="">
          {loading
            ? t("loading")
            : options.length === 0
              ? t("noProperties")
              : t("skip")}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-muted-foreground/80">{help}</p>
    </div>
  );
}

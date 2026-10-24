"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, GitMerge, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  runMapping,
  importToRedirectRules,
  type MigrationState,
} from "./actions";

export function MigrationForm() {
  const t = useTranslations("tools.ui.migration-map");
  const [state, formAction, pending] = useActionState<
    MigrationState | null,
    FormData
  >(runMapping, null);
  const [tab, setTab] = useState<"nginx" | "apache" | "nextjs" | "table">("nginx");
  const [copied, setCopied] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importing, startImport] = useTransition();

  function importToManager() {
    setImportMsg(null);
    const oldUrls = (
      document.querySelector('textarea[name="oldUrls"]') as HTMLTextAreaElement
    )?.value;
    const newUrls = (
      document.querySelector('textarea[name="newUrls"]') as HTMLTextAreaElement
    )?.value;
    if (!oldUrls || !newUrls) {
      setImportMsg(t("fillBoth"));
      return;
    }
    const fd = new FormData();
    fd.set("oldUrls", oldUrls);
    fd.set("newUrls", newUrls);
    startImport(async () => {
      const r = await importToRedirectRules(null, fd);
      if (r.ok) {
        setImportMsg(t("imported", { count: r.inserted }));
      } else {
        setImportMsg(r.error);
      }
    });
  }

  function copy(label: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <>
      <form
        action={formAction}
        className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("oldLabel")}</span>
            <textarea
              name="oldUrls"
              required
              rows={10}
              spellCheck={false}
              placeholder={"https://oldsite.com/blog/old-post\nhttps://oldsite.com/about-us\nhttps://oldsite.com/products/widget"}
              className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-[11px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("newLabel")}</span>
            <textarea
              name="newUrls"
              required
              rows={10}
              spellCheck={false}
              placeholder={"https://newsite.com/blog/new-post\nhttps://newsite.com/about\nhttps://newsite.com/shop/widget"}
              className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-[11px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-amber-500/15 px-5 text-sm font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("matching")}
            </>
          ) : (
            <>
              <GitMerge className="mr-2 size-4" />
              {t("submit")}
            </>
          )}
        </button>
      </form>

      {state && !state.ok && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-inset ring-rose-500/30">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={importToManager}
              disabled={importing}
              className="inline-flex h-9 items-center rounded-md bg-emerald-500/15 px-4 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  {t("importing")}
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-3" />
                  {t("importButton")}
                </>
              )}
            </button>
            {importMsg && (
              <span className="text-xs text-muted-foreground">{importMsg}</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label={t("statOld")} value={state.map.summary.total.toString()} />
            <Stat label={t("statHigh")} value={state.map.summary.matched.toString()} hint="≥85%" tone="emerald" />
            <Stat label={t("statReview")} value={state.map.summary.review.toString()} hint="50-85%" tone="amber" />
            <Stat
              label={t("statAvg")}
              value={`${(state.map.summary.avgConfidence * 100).toFixed(0)}%`}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-white/[0.06]">
            {(["table", "nginx", "apache", "nextjs"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === key
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {key === "table" ? t("tabTable") : key}
              </button>
            ))}
          </div>

          {tab === "table" && (
            <section className="glass-apple relative overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">{t("colOld")}</th>
                      <th className="px-4 py-2 text-left">{t("colNew")}</th>
                      <th className="px-4 py-2 text-right">{t("colConf")}</th>
                      <th className="px-4 py-2 text-left">{t("colReason")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.map.rows.map((r, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-4 py-1.5 font-mono">{r.oldUrl}</td>
                        <td className="px-4 py-1.5 font-mono">
                          {r.newUrl ?? <span className="text-rose-300">{t("review")}</span>}
                        </td>
                        <td className={`px-4 py-1.5 text-right tabular-nums ${
                          r.confidence >= 0.85
                            ? "text-emerald-300"
                            : r.confidence >= 0.5
                              ? "text-amber-300"
                              : "text-rose-300"
                        }`}>
                          {(r.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-1.5 text-muted-foreground">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "nginx" && (
            <CopyBlock
              label="nginx"
              code={state.output.nginx || t("noRows")}
              copied={copied === "nginx"}
              onCopy={() => copy("nginx", state.output.nginx)}
            />
          )}
          {tab === "apache" && (
            <CopyBlock
              label="apache"
              code={state.output.apache || t("noRows")}
              copied={copied === "apache"}
              onCopy={() => copy("apache", state.output.apache)}
            />
          )}
          {tab === "nextjs" && (
            <CopyBlock
              label="nextjs"
              code={state.output.nextjs || t("noRows")}
              copied={copied === "nextjs"}
              onCopy={() => copy("nextjs", state.output.nextjs)}
            />
          )}
        </>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const t = tone
    ? { emerald: "text-emerald-300", amber: "text-amber-300", rose: "text-rose-300" }[tone]
    : "";
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${t}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function CopyBlock({
  label,
  code,
  copied,
  onCopy,
}: {
  label: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const tCommon = useTranslations("tools.common");
  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <span className="text-sm font-semibold">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-7 items-center rounded-md bg-white/5 px-2 text-[11px] text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="mr-1 size-3 text-emerald-300" />
              {tCommon("copied")}
            </>
          ) : (
            <>
              <Copy className="mr-1 size-3" />
              {tCommon("copy")}
            </>
          )}
        </button>
      </header>
      <pre className="max-h-[500px] overflow-auto p-4 font-mono text-[11px] leading-relaxed">
        {code}
      </pre>
    </section>
  );
}

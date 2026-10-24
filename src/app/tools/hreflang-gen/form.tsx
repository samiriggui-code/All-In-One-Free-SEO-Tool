"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

export function HreflangForm() {
  const t = useTranslations("tools.ui.hreflang-gen");
  const tCommon = useTranslations("tools.common");
  const [pairs, setPairs] = useState(
    "en-US\thttps://example.com/page\nen-GB\thttps://example.com/uk/page\nde-DE\thttps://example.com/de/page\nx-default\thttps://example.com/page",
  );
  const [tab, setTab] = useState<"html" | "header" | "sitemap">("html");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    const out: { lang: string; url: string }[] = [];
    for (const line of pairs.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [lang, url] = trimmed.split(/\t+/);
      if (!lang || !url) continue;
      out.push({ lang: lang.trim(), url: url.trim() });
    }
    return out;
  }, [pairs]);

  const warnings: string[] = [];
  const langs = parsed.map((p) => p.lang);
  if (parsed.length > 0) {
    if (!langs.includes("x-default"))
      warnings.push(t("warnNoXDefault"));
    if (parsed.length !== new Set(langs).size)
      warnings.push(t("warnDuplicate"));
    for (const p of parsed) {
      if (!/^([a-z]{2,3}(-[A-Z]{2})?|x-default)$/.test(p.lang)) {
        warnings.push(t("warnInvalidCode", { lang: p.lang }));
      }
      try {
        new URL(p.url);
      } catch {
        warnings.push(t("warnInvalidUrl", { lang: p.lang, url: p.url }));
      }
    }
  }

  const html = parsed
    .map(
      (p) =>
        `<link rel="alternate" href="${escAttr(p.url)}" hreflang="${escAttr(p.lang)}" />`,
    )
    .join("\n");

  const header = parsed
    .map((p) => `<${p.url}>; rel="alternate"; hreflang="${p.lang}"`)
    .join(", ");

  const sitemap =
    `<url>\n  <loc>${parsed[0]?.url ?? ""}</loc>\n` +
    parsed
      .map(
        (p) =>
          `  <xhtml:link rel="alternate" hreflang="${escXml(p.lang)}" href="${escXml(p.url)}" />`,
      )
      .join("\n") +
    "\n</url>";

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const out = tab === "html" ? html : tab === "header" ? header : sitemap;

  return (
    <>
      <div className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">
            {t("pairsLabel")}
          </span>
          <textarea
            value={pairs}
            onChange={(e) => setPairs(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-md border border-white/10 bg-card/60 px-3 py-2 font-mono text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <div className="text-[10px] text-muted-foreground">
          <Globe className="mr-1 inline size-3" />
          {t("pairs", { count: parsed.length })}
        </div>
      </div>

      {warnings.length > 0 && (
        <section className="glass-apple relative overflow-hidden rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold">{t("warnings")}</h3>
          <ul className="space-y-1 text-xs">
            {warnings.map((w, i) => (
              <li
                key={i}
                className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-300 ring-1 ring-inset ring-amber-500/30"
              >
                ⚠ {w}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/[0.06]">
        {(["html", "header", "sitemap"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === key
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "html"
              ? t("tabHead")
              : key === "header"
                ? t("tabHeader")
                : t("tabSitemap")}
          </button>
        ))}
      </div>

      <section className="glass-apple relative overflow-hidden rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <span className="text-sm font-semibold">{tab}</span>
          <button
            type="button"
            onClick={() => copy(out)}
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
        <pre className="max-h-[400px] overflow-auto p-4 font-mono text-[11px] leading-relaxed">
          {out}
        </pre>
      </section>
    </>
  );
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

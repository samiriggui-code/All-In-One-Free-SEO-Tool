"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  ClipboardList,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  Megaphone,
  Plug,
  Search,
  Shuffle,
  Sparkles,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { navItemMessageKey } from "@/i18n/nav";
import { toolCatalogSlug } from "@/lib/i18n/tool-slug";
import { MISSION_CATEGORIES, type MissionCategoryId } from "@/lib/tool-catalog";
import { GskSheet } from "../gsk-sheet";
import { setToolEnabled } from "./actions";

export type ToolCardState = "ready" | "setup" | "off";

export type ToolCard = {
  href: string;
  category: MissionCategoryId;
  aiUsage: "none" | "partial" | "required";
  usesBrowser: boolean;
  needsGsc: boolean;
  state: ToolCardState;
};

type Tab = "all" | ToolCardState;

const CATEGORY_ICONS: Record<MissionCategoryId, LucideIcon> = {
  prospecting: Briefcase,
  setup: Plug,
  audit: Stethoscope,
  strategy: Search,
  content: FileText,
  links: Link2,
  local: MapPin,
  ai: Sparkles,
  ads: Megaphone,
  reporting: TrendingUp,
  special: Shuffle,
  agency: ClipboardList,
};

const TAG: Record<ToolCardState, string> = {
  ready: "gsk-tag gsk-tag--success",
  setup: "gsk-tag gsk-tag--warning",
  off: "gsk-tag gsk-tag--default",
};

/** Name and one line for a tool, from whichever catalogue knows it. */
function useToolCopy() {
  const t = useTranslations("settings.tools");
  const tCatalog = useTranslations("tools.catalog");
  const tNav = useTranslations("nav.items");
  return (href: string) => {
    const key = navItemMessageKey(href);
    const slug = href.startsWith("/tools/") ? toolCatalogSlug(href) : null;
    const title = t.has(`titles.${key}`)
      ? t(`titles.${key}`)
      : slug && tCatalog.has(`${slug}.title`)
        ? tCatalog(`${slug}.title`)
        : tNav.has(key)
          ? tNav(key)
          : href;
    const description = t.has(`descriptions.${key}`)
      ? t(`descriptions.${key}`)
      : slug && tCatalog.has(`${slug}.description`)
        ? tCatalog(`${slug}.description`)
        : "";
    return { title, description };
  };
}

export function ToolsPanel({
  cards: initial,
  canToggle,
  hasAiKey,
  gscConnected,
}: {
  cards: ToolCard[];
  canToggle: boolean;
  hasAiKey: boolean;
  gscConnected: boolean;
}) {
  const t = useTranslations("settings.tools");
  const copyOf = useToolCopy();
  const [cards, setCards] = useState(initial);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const withCopy = cards.map((c) => ({ ...c, ...copyOf(c.href) }));
  const q = query.trim().toLowerCase();
  const shown = withCopy.filter(
    (c) =>
      (tab === "all" || c.state === tab) &&
      (!q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
  );
  const counts = useMemo(() => {
    const n: Record<Tab, number> = { all: cards.length, ready: 0, setup: 0, off: 0 };
    for (const c of cards) n[c.state]++;
    return n;
  }, [cards]);

  const current = open ? withCopy.find((c) => c.href === open) ?? null : null;

  /** What a tool's state becomes when it is turned back on. */
  const onState = (c: ToolCard): ToolCardState =>
    (c.aiUsage === "required" && !hasAiKey) || (c.needsGsc && !gscConnected) ? "setup" : "ready";

  const setEnabled = (href: string, enabled: boolean) =>
    setCards((all) =>
      all.map((c) => (c.href === href ? { ...c, state: enabled ? onState(c) : "off" } : c)),
    );

  return (
    <>
      <section className="gsk-block">
        <div className="flex flex-wrap items-center gap-3">
          <div className="gsk-tabbar max-w-full overflow-x-auto" role="tablist">
            {(["all", "ready", "setup", "off"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                className="gsk-tab whitespace-nowrap"
                onClick={() => setTab(k)}
              >
                {t(`tab_${k}`)}
                <span className="gsk-tab__count">{counts[k]}</span>
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className="gsk-input ml-auto w-full sm:w-64"
          />
        </div>
        {shown.length === 0 ? <p className="gsk-help">{t("empty")}</p> : null}
      </section>

      {MISSION_CATEGORIES.map((cat) => {
        const list = shown.filter((c) => c.category === cat);
        if (list.length === 0) return null;
        const Icon = CATEGORY_ICONS[cat];
        return (
          <section key={cat} className="gsk-block" aria-labelledby={`tools-cat-${cat}`}>
            <div className="gsk-block-head">
              <h2 id={`tools-cat-${cat}`} className="gsk-block-title flex items-center gap-2">
                <Icon className="size-4" strokeWidth={1.75} />
                {t(`categories.${cat}.label`)}
                <span className="gsk-tab__count">{t("count", { count: list.length })}</span>
              </h2>
              <p className="gsk-block-description">{t(`categories.${cat}.description`)}</p>
            </div>
            <div className="gsk-card-grid">
              {list.map((c) => (
                <button
                  key={c.href}
                  type="button"
                  className={c.state === "ready" ? "gsk-card gsk-card--on" : "gsk-card"}
                  onClick={() => setOpen(c.href)}
                  aria-haspopup="dialog"
                >
                  <span className="gsk-card__badge" aria-hidden>
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="gsk-card__body">
                    <span className="gsk-card__header">
                      <span className="gsk-card__title">{c.title}</span>
                    </span>
                    <span className="gsk-card__subtitle">
                      <span className={TAG[c.state]}>{t(c.state)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {current ? (
        <ToolSheet
          key={current.href}
          card={current}
          canToggle={canToggle}
          hasAiKey={hasAiKey}
          gscConnected={gscConnected}
          onToggle={setEnabled}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function ToolSheet({
  card: c,
  canToggle,
  hasAiKey,
  gscConnected,
  onToggle,
  onClose,
}: {
  card: ToolCard & { title: string; description: string };
  canToggle: boolean;
  hasAiKey: boolean;
  gscConnected: boolean;
  onToggle: (href: string, enabled: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations("settings.tools");
  const [pending, startTransition] = useTransition();
  const Icon = CATEGORY_ICONS[c.category];
  const enabled = c.state !== "off";

  const toggle = (next: boolean) => {
    onToggle(c.href, next);
    startTransition(async () => {
      const r = await setToolEnabled(c.href, next).catch(() => ({ ok: false }));
      if (!r.ok) onToggle(c.href, !next);
    });
  };

  return (
    <GskSheet
      title={c.title}
      subtitle={`${t(`categories.${c.category}.label`)} · ${t(c.state)}`}
      icon={<Icon className="size-4" />}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <div className="gsk-drawer__body">
        {c.description ? (
          <p className="m-0 text-[13px] leading-relaxed text-[var(--gsk-text-2)]">{c.description}</p>
        ) : null}

        <div>
          <h4 className="gsk-section-title">{t("sheetNeeds")}</h4>
          <ul className="m-0 list-none space-y-3 p-0 text-[13px]">
            <Need
              label={t("needAi")}
              ok={c.aiUsage !== "required" || hasAiKey}
              detail={
                c.aiUsage === "required"
                  ? `${t("needAiRequired")} ${hasAiKey ? t("configured") : t("missing")}`
                  : c.aiUsage === "partial"
                    ? t("needAiPartial")
                    : t("needAiNone")
              }
              fixHref={c.aiUsage !== "none" && !hasAiKey ? "/settings/ai" : null}
              fixLabel={t("configure")}
            />
            {c.needsGsc ? (
              <Need
                label={t("needGsc")}
                ok={gscConnected}
                detail={gscConnected ? t("needGscOk") : t("needGscMissing")}
                fixHref={gscConnected ? null : "/settings/google"}
                fixLabel={t("configure")}
              />
            ) : null}
            {c.usesBrowser ? (
              <Need label={t("needBrowser")} ok detail={t("needBrowserHint")} />
            ) : null}
          </ul>
        </div>

        <div className="gsk-row">
          <div className="gsk-row-info">
            <label className="gsk-row-label" htmlFor="tool-enabled">
              {t("enabled")}
            </label>
            <p className="gsk-row-desc">{canToggle ? t("enabledHint") : t("adminOnly")}</p>
          </div>
          <div className="gsk-row-control">
            <input
              id="tool-enabled"
              type="checkbox"
              role="switch"
              className="gsk-switch"
              checked={enabled}
              disabled={!canToggle || pending}
              onChange={(e) => toggle(e.target.checked)}
            />
          </div>
        </div>
      </div>

      <footer className="gsk-drawer__footer">
        <div />
        <Link href={c.href} className="gsk-btn gsk-btn--primary" onClick={onClose}>
          {t("open")}
          <ExternalLink className="size-3.5" />
        </Link>
      </footer>
    </GskSheet>
  );
}

function Need({
  label,
  ok,
  detail,
  fixHref = null,
  fixLabel,
}: {
  label: string;
  ok: boolean;
  detail: string;
  fixHref?: string | null;
  fixLabel?: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className={ok ? "gsk-dot gsk-dot--on mt-1.5" : "gsk-dot mt-1.5"} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-[var(--gsk-text-1)]">{label}</span>
        <span className="block text-[var(--gsk-text-2)]">{detail}</span>
      </span>
      {fixHref ? (
        <Link href={fixHref} className="gsk-btn shrink-0">
          {fixLabel}
        </Link>
      ) : null}
    </li>
  );
}

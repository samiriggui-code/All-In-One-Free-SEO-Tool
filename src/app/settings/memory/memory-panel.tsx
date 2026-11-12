"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { AlertCircle, Check, Download, Pencil, Trash2, X } from "lucide-react";
import { SettingsBlock } from "../section-ui";
import {
  addMemoryAction,
  clearMyMemoriesAction,
  deleteMemoryAction,
  exportMemoriesAction,
  setMemoryEnabledAction,
  updateMemoryAction,
  type MemoryResult,
} from "./actions";

type Scope = "user" | "team" | "client";
type Category = "preference" | "fact" | "instruction";
export type MemoryRow = {
  id: number;
  scope: Scope;
  userId: number | null;
  clientId: number | null;
  text: string;
  category: Category;
  status: "active" | "pending" | "rejected";
  source: "manual" | "conversation" | "auto";
  edited: boolean;
  updatedAt: string;
};

const CATEGORIES: Category[] = ["preference", "fact", "instruction"];

export function MemoryPanel({
  enabled,
  hasAccount,
  mayEdit,
  clients,
  memories,
}: {
  enabled: boolean;
  hasAccount: boolean;
  mayEdit: boolean;
  myId: number | null;
  clients: { id: number; name: string }[];
  memories: MemoryRow[];
}) {
  const t = useTranslations("settingsMemory");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("user");
  const [clientId, setClientId] = useState<number | null>(clients[0]?.id ?? null);
  const [category, setCategory] = useState<Category>("preference");
  const [text, setText] = useState("");

  const run = (fn: () => Promise<MemoryResult>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) return setError(r.error);
      after?.();
      router.refresh();
    });

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const canChange = (m: MemoryRow) => m.scope === "user" || mayEdit;
  const waiting = memories.filter((m) => m.status === "pending");
  const groups: { key: string; title: string; rows: MemoryRow[] }[] = [
    { key: "user", title: t("scopes.user"), rows: memories.filter((m) => m.scope === "user" && m.status !== "pending") },
    { key: "team", title: t("scopes.team"), rows: memories.filter((m) => m.scope === "team" && m.status !== "pending") },
    ...clients
      .map((c) => ({
        key: `client-${c.id}`,
        title: t("scopes.clientNamed", { name: c.name }),
        rows: memories.filter((m) => m.scope === "client" && m.clientId === c.id && m.status !== "pending"),
      }))
      .filter((g) => g.rows.length > 0),
  ];

  return (
    <>
      {error ? (
        <p className="gsk-help gsk-status-error inline-flex items-center gap-1">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      ) : null}

      <SettingsBlock title={t("settingsTitle")}>
        <div className="gsk-row">
          <div className="gsk-row-info">
            <span className="gsk-row-label">{t("enabled")}</span>
            <p className="gsk-row-desc">{hasAccount ? t("enabledHint") : t("noAccount")}</p>
          </div>
          <div className="gsk-row-control">
            <div className="gsk-segmented" role="group" aria-label={t("enabled")}>
              {[true, false].map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  aria-pressed={enabled === on}
                  disabled={pending || !hasAccount}
                  onClick={() => run(() => setMemoryEnabledAction(on))}
                >
                  {on ? t("on") : t("off")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="gsk-row">
          <div className="gsk-row-info">
            <span className="gsk-row-label">{t("exportTitle")}</span>
            <p className="gsk-row-desc">{t("exportHint")}</p>
          </div>
          <div className="gsk-row-control flex gap-2">
            <button
              type="button"
              className="gsk-btn"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const json = await exportMemoriesAction();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
                  a.download = "memoire-assistant.json";
                  a.click();
                  URL.revokeObjectURL(a.href);
                })
              }
            >
              <Download className="size-3.5" />
              {t("export")}
            </button>
            <button
              type="button"
              className="gsk-btn gsk-btn--danger-text"
              disabled={pending}
              onClick={() => {
                if (window.confirm(t("clearConfirm"))) run(() => clearMyMemoriesAction());
              }}
            >
              {t("clear")}
            </button>
          </div>
        </div>
      </SettingsBlock>

      <SettingsBlock title={t("addTitle")} description={t("addHint")}>
        <form
          className="flex flex-col gap-2 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addMemoryAction({ scope, text, category, clientId }), () => setText(""));
          }}
        >
          <textarea
            className="gsk-textarea"
            rows={2}
            maxLength={500}
            value={text}
            required
            placeholder={t("placeholder")}
            aria-label={t("addTitle")}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select className="gsk-select" value={scope} aria-label={t("scope")} onChange={(e) => setScope(e.target.value as Scope)}>
              <option value="user">{t("scopes.user")}</option>
              {mayEdit ? <option value="team">{t("scopes.team")}</option> : null}
              {mayEdit && clients.length ? <option value="client">{t("scopes.client")}</option> : null}
            </select>
            {scope === "client" ? (
              <select
                className="gsk-select"
                value={clientId ?? ""}
                aria-label={t("client")}
                onChange={(e) => setClientId(Number(e.target.value))}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select className="gsk-select" value={category} aria-label={t("category")} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
            <button type="submit" className="gsk-btn gsk-btn--primary ml-auto" disabled={pending || !text.trim()}>
              {t("add")}
            </button>
          </div>
        </form>
      </SettingsBlock>

      {waiting.length ? (
        <SettingsBlock title={t("pendingTitle", { count: waiting.length })} description={t("pendingHint")}>
          <ul className="m-0 list-none p-0">
            {waiting.map((m) => (
              <MemoryItem key={m.id} m={m} where={whereLabel(m)} canChange={canChange(m)} busy={pending} run={run} pendingRow />
            ))}
          </ul>
        </SettingsBlock>
      ) : null}

      {groups.map((g) => (
        <SettingsBlock key={g.key} title={g.title}>
          {g.rows.length === 0 ? (
            <p className="gsk-note">{t("empty")}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {g.rows.map((m) => (
                <MemoryItem key={m.id} m={m} where={null} canChange={canChange(m)} busy={pending} run={run} />
              ))}
            </ul>
          )}
        </SettingsBlock>
      ))}
    </>
  );

  function whereLabel(m: MemoryRow): string {
    if (m.scope === "client") return t("scopes.clientNamed", { name: clientName.get(m.clientId ?? -1) ?? `#${m.clientId}` });
    return t(`scopes.${m.scope}`);
  }
}

function MemoryItem({
  m,
  where,
  canChange,
  busy,
  run,
  pendingRow,
}: {
  m: MemoryRow;
  where: string | null;
  canChange: boolean;
  busy: boolean;
  run: (fn: () => Promise<MemoryResult>, after?: () => void) => void;
  pendingRow?: boolean;
}) {
  const t = useTranslations("settingsMemory");
  const format = useFormatter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.text);
  return (
    <li className="gsk-row">
      <div className="gsk-row-info min-w-0">
        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateMemoryAction(m.id, { text: draft }), () => setEditing(false));
            }}
          >
            <input className="gsk-input flex-1" value={draft} maxLength={500} aria-label={t("edit")} onChange={(e) => setDraft(e.target.value)} />
            <button type="submit" className="gsk-btn gsk-btn--primary gsk-btn--sm" disabled={busy}>
              {t("save")}
            </button>
          </form>
        ) : (
          <span className={`gsk-row-label ${m.status === "rejected" ? "line-through opacity-60" : ""}`}>{m.text}</span>
        )}
        <p className="gsk-row-desc">
          {[
            where,
            t(`categories.${m.category}`),
            t(`sources.${m.source}`),
            m.edited ? t("editedByHand") : null,
            m.status === "rejected" ? t("rejected") : null,
            format.dateTime(new Date(m.updatedAt), { dateStyle: "medium" }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {canChange ? (
        <div className="gsk-row-control flex items-center gap-1">
          {pendingRow ? (
            <>
              <button type="button" className="gsk-btn gsk-btn--sm gsk-btn--primary" disabled={busy} onClick={() => run(() => updateMemoryAction(m.id, { status: "active" }))}>
                <Check className="size-3.5" />
                {t("accept")}
              </button>
              <button type="button" className="gsk-btn gsk-btn--sm" disabled={busy} onClick={() => run(() => updateMemoryAction(m.id, { status: "rejected" }))}>
                <X className="size-3.5" />
                {t("reject")}
              </button>
            </>
          ) : null}
          <button type="button" className="gsk-btn gsk-btn--text gsk-btn--sm" aria-label={t("edit")} title={t("edit")} disabled={busy} onClick={() => setEditing(!editing)}>
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            className="gsk-btn gsk-btn--text gsk-btn--sm gsk-btn--danger-text"
            aria-label={t("delete")}
            title={t("delete")}
            disabled={busy}
            onClick={() => run(() => deleteMemoryAction(m.id))}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : null}
    </li>
  );
}

"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Bot, Download, ExternalLink, GitBranch, Plus, RefreshCw, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildLlmsTxt, type LlmsTxtResource } from "@/lib/content-studio/seo/llms-txt";
import type { PaaNode } from "@/lib/content-studio/seo/paa-tree";
import {
  createArticle,
  exploreQuestions,
  measureTopicCoverage,
  refreshFromUrl,
  type CreateState,
  type QuestionTreeState,
  type TopicCoverageState,
} from "../../../actions";

const textareaCls =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function ContentTools({
  clientId,
  editable,
  site,
  published,
}: {
  clientId: number;
  editable: boolean;
  site: { name: string; url: string };
  published: LlmsTxtResource[];
}) {
  const tErr = useTranslations("content.errors");
  // One create action for every "write about this" button on the page.
  const [created, createAction, creating] = useActionState<CreateState, FormData>(createArticle, null);

  const newArticle = (keyword: string) =>
    editable ? (
      <form action={createAction} className="shrink-0">
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="keyword" value={keyword.slice(0, 120)} />
        <NewArticleButton disabled={creating} />
      </form>
    ) : null;

  return (
    <div className="space-y-6">
      {created && !created.ok && <p className="text-sm text-rose-300">{tErr(created.error)}</p>}
      {editable && <QuestionTree clientId={clientId} newArticle={newArticle} />}
      {editable && <TopicCoverage clientId={clientId} newArticle={newArticle} />}
      {editable && <Refresher clientId={clientId} />}
      <LlmsTxt site={site} published={published} />
    </div>
  );
}

function NewArticleButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations("content.tools");
  return (
    <Button type="submit" size="xs" variant="outline" disabled={disabled} title={t("newArticle")}>
      <Plus />
      {t("newArticle")}
    </Button>
  );
}

function Panel({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Bot;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/5 bg-card/40 p-5">
      <div className="space-y-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-violet-300" />
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function SeedForm({
  id,
  label,
  placeholder,
  button,
  running,
  onRun,
}: {
  id: string;
  label: string;
  placeholder: string;
  button: string;
  running: boolean;
  onRun: (seed: string) => void;
}) {
  const t = useTranslations("content.tools");
  const [seed, setSeed] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRun(seed);
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          required
          minLength={2}
          maxLength={120}
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <Button type="submit" disabled={running || seed.trim().length < 2}>
        {running ? t("running") : button}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------

function QuestionTree({
  clientId,
  newArticle,
}: {
  clientId: number;
  newArticle: (keyword: string) => React.ReactNode;
}) {
  const t = useTranslations("content.tools.questions");
  const tErr = useTranslations("content.errors");
  const [state, setState] = useState<QuestionTreeState | null>(null);
  const [running, start] = useTransition();
  const count = state?.ok ? countNodes(state.tree) - 1 : 0;

  return (
    <Panel icon={GitBranch} title={t("title")} hint={t("hint")}>
      <SeedForm
        id="questions-seed"
        label={t("seed")}
        placeholder={t("placeholder")}
        button={t("run")}
        running={running}
        onRun={(seed) => start(async () => setState(await exploreQuestions({ clientId, seed })))}
      />
      {state && !state.ok && <p className="text-sm text-rose-300">{tErr(state.error)}</p>}
      {state?.ok && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("found", { count })}</p>
          {count > 0 && (
            <ul className="space-y-1">
              {state.tree.children.map((n) => (
                <TreeNode key={n.question} node={n} newArticle={newArticle} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

function countNodes(n: PaaNode): number {
  return 1 + n.children.reduce((sum, c) => sum + countNodes(c), 0);
}

function TreeNode({ node, newArticle }: { node: PaaNode; newArticle: (keyword: string) => React.ReactNode }) {
  return (
    <li>
      <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
        <span className="min-w-0 flex-1 text-sm text-foreground">{node.question}</span>
        {newArticle(node.question)}
      </div>
      {node.children.length > 0 && (
        <ul className="ml-4 space-y-1 border-l border-white/10 pl-2">
          {node.children.map((c) => (
            <TreeNode key={c.question} node={c} newArticle={newArticle} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------

function TopicCoverage({
  clientId,
  newArticle,
}: {
  clientId: number;
  newArticle: (keyword: string) => React.ReactNode;
}) {
  const t = useTranslations("content.tools.coverage");
  const tErr = useTranslations("content.errors");
  const [state, setState] = useState<TopicCoverageState | null>(null);
  const [running, start] = useTransition();
  const r = state?.ok ? state.result : null;

  return (
    <Panel icon={Target} title={t("title")} hint={t("hint")}>
      <SeedForm
        id="coverage-seed"
        label={t("seed")}
        placeholder={t("placeholder")}
        button={t("run")}
        running={running}
        onRun={(seed) => start(async () => setState(await measureTopicCoverage({ clientId, seed })))}
      />
      {state && !state.ok && <p className="text-sm text-rose-300">{tErr(state.error)}</p>}
      {r && r.tier === "no_data" && <p className="text-sm text-muted-foreground">{t("noData")}</p>}
      {r && r.tier !== "no_data" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{r.score}</span>
            <span className="text-sm text-muted-foreground">/ 100 · {t(`tier.${r.tier}`)}</span>
            {r.wikipedia_anchor && (
              <a
                href={r.wikipedia_anchor}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("source")}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("summary", { covered: r.covered.length, total: r.total_entities })}
          </p>
          {r.missing.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-foreground">{t("missing")}</h3>
              <ul className="space-y-1">
                {r.missing.map((m) => (
                  <li key={m.entity} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5">
                    <span className="min-w-0 flex-1 text-sm text-foreground">{m.entity}</span>
                    {newArticle(`${m.entity} ${r.niche}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.covered.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-foreground">{t("covered")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {r.covered.map((c) => (
                  <span
                    key={c.entity}
                    className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200"
                  >
                    {c.entity} · {c.post_count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function Refresher({ clientId }: { clientId: number }) {
  const t = useTranslations("content.tools.refresh");
  const tErr = useTranslations("content.errors");
  const [state, action, running] = useActionState<CreateState, FormData>(refreshFromUrl, null);

  return (
    <Panel icon={RefreshCw} title={t("title")} hint={t("hint")}>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="refresh-url">{t("url")}</Label>
          <Input id="refresh-url" name="url" type="url" required maxLength={500} placeholder="https://" />
        </div>
        <Button type="submit" disabled={running}>
          {running ? t("running") : t("run")}
        </Button>
      </form>
      {state && !state.ok && <p className="text-sm text-rose-300">{tErr(state.error)}</p>}
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function LlmsTxt({ site, published }: { site: { name: string; url: string }; published: LlmsTxtResource[] }) {
  const t = useTranslations("content.tools.llms");
  const [description, setDescription] = useState("");

  const text = useMemo(
    () =>
      buildLlmsTxt({
        siteName: site.name,
        description: description || site.url,
        sections: [
          { heading: t("sectionSite"), resources: [{ title: site.name, url: site.url, summary: description || site.url }] },
          { heading: t("sectionArticles"), resources: published },
        ],
      }),
    [description, published, site.name, site.url, t],
  );

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel icon={Bot} title={t("title")} hint={t("hint", { count: published.length })}>
      <div className="space-y-1.5">
        <Label htmlFor="llms-description">{t("description")}</Label>
        <textarea
          id="llms-description"
          className={`${textareaCls} min-h-16`}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-3 font-mono text-xs">
        {text}
      </pre>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={download}>
          <Download />
          {t("download")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("where")}</p>
      </div>
    </Panel>
  );
}

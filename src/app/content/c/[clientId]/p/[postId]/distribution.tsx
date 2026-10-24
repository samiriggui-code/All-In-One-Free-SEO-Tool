"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Code2, Copy, Download, ExternalLink, Loader2, Mail, Send, Share2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HUGO_SCHEMA_SNIPPET } from "@/lib/content-studio/exports/hugo";
import type { ContentPost } from "@/lib/content-studio/store";
import type { NewsletterPack, SocialPack } from "@/lib/content-studio/types";
import {
  buildSchemaForArticle,
  generateNewsletterExcerpt,
  generateSocialPosts,
  markArticlePublished,
  publishToWordPress,
  type ContentError,
} from "../../../../actions";

export type DistributionInitial = {
  schemaJsonLd: string;
  social: SocialPack | null;
  newsletter: NewsletterPack | null;
  publishedUrl: string;
};

type Busy = null | "schema" | "social" | "newsletter" | "wp-draft" | "wp-publish" | "mark";

const EXPORTS = [
  { format: "wordpress", label: "WordPress (.xml)" },
  { format: "ghost", label: "Ghost (.json)" },
  { format: "webflow", label: "Webflow (.csv)" },
  { format: "hugo", label: "Hugo (.md)" },
  { format: "markdown", label: "Markdown (.md)" },
] as const;

export function Distribution({
  clientId,
  postId,
  editable,
  hasDraft,
  wpConnected,
  initial,
  beforeRun,
  onStatus,
}: {
  clientId: number;
  postId: number;
  editable: boolean;
  hasDraft: boolean;
  wpConnected: boolean;
  initial: DistributionInitial;
  /** Saves pending edits, so every generator works from the text on screen. */
  beforeRun: () => Promise<void>;
  onStatus: (s: ContentPost["status"]) => void;
}) {
  const t = useTranslations("content.distribution");
  const tErr = useTranslations("content.errors");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState(initial.schemaJsonLd);
  const [social, setSocial] = useState(initial.social);
  const [newsletter, setNewsletter] = useState(initial.newsletter);
  const [publishedUrl, setPublishedUrl] = useState(initial.publishedUrl);
  const [wpDraftUrl, setWpDraftUrl] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  const ids = { clientId, postId };
  const locked = !editable || busy !== null || !hasDraft;

  async function run<T extends { ok: boolean }>(
    kind: Exclude<Busy, null>,
    fn: () => Promise<T>,
    onOk: (r: T) => void,
  ) {
    setBusy(kind);
    setError(null);
    try {
      await beforeRun();
      const r = await fn();
      if (r.ok) onOk(r);
      else {
        const f = r as unknown as { error: ContentError | "wordpress"; detail?: string };
        setError(f.error === "wordpress" ? t("wpFailed", { detail: f.detail ?? "" }) : tErr(f.error));
      }
    } catch {
      setError(tErr("failed"));
    } finally {
      setBusy(null);
    }
  }

  const sendToWp = (mode: "draft" | "publish") => {
    if (mode === "publish" && !window.confirm(t("confirmPublish"))) return;
    void run(mode === "publish" ? "wp-publish" : "wp-draft", () => publishToWordPress({ ...ids, mode }), (r) => {
      if (!("url" in r)) return;
      if (mode === "publish") {
        setPublishedUrl(r.url);
        onStatus("published");
      } else setWpDraftUrl(r.url);
    });
  };

  const exportHref = (format: string) => `/content/c/${clientId}/export?format=${format}&postId=${postId}`;

  return (
    <section className="space-y-5 rounded-2xl border border-white/5 bg-card/40 p-5">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-violet-500/15 text-xs text-violet-300">
            3
          </span>
          <Send className="size-4 text-violet-300" />
          {t("title")}
        </h2>
        <p className="text-xs text-muted-foreground">{hasDraft ? t("hint") : t("needsDraft")}</p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
      )}

      {/* Publish */}
      <Block icon={Send} title={t("publishTitle")}>
        {publishedUrl ? (
          <p className="text-sm text-emerald-300">
            {t("publishedAt")}{" "}
            <a href={publishedUrl} target="_blank" rel="noreferrer noopener" className="underline">
              {publishedUrl}
            </a>
          </p>
        ) : null}
        {wpConnected ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={locked} onClick={() => sendToWp("draft")}>
              {busy === "wp-draft" ? <Loader2 className="animate-spin" /> : <Send />}
              {t("wpDraft")}
            </Button>
            <Button disabled={locked} onClick={() => sendToWp("publish")}>
              {busy === "wp-publish" ? <Loader2 className="animate-spin" /> : <Send />}
              {t("wpPublish")}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("wpMissing")}{" "}
            <Link href={`/clients/${clientId}`} className="text-violet-300 underline">
              {t("wpConnect")}
            </Link>
          </p>
        )}
        {wpDraftUrl && (
          <p className="text-xs text-emerald-300">
            {t("wpDraftDone")}{" "}
            <a href={wpDraftUrl} target="_blank" rel="noreferrer noopener" className="underline">
              {t("open")} <ExternalLink className="inline size-3" />
            </a>
          </p>
        )}
        {editable && !publishedUrl && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-sm"
              type="url"
              placeholder={t("manualPlaceholder")}
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              disabled={busy !== null}
            />
            <Button
              variant="ghost"
              disabled={busy !== null || !/^https?:\/\/\S+$/.test(manualUrl.trim())}
              onClick={() =>
                run("mark", () => markArticlePublished({ ...ids, url: manualUrl.trim() }), () => {
                  setPublishedUrl(manualUrl.trim());
                  onStatus("published");
                })
              }
            >
              <Check />
              {t("markPublished")}
            </Button>
          </div>
        )}
      </Block>

      {/* Exports */}
      <Block icon={Download} title={t("exportTitle")}>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) =>
            hasDraft ? (
              <a
                key={e.format}
                href={exportHref(e.format)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
              >
                <Download className="size-3" />
                {e.label}
              </a>
            ) : (
              <span
                key={e.format}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 px-3 py-1.5 text-xs text-muted-foreground opacity-50"
              >
                {e.label}
              </span>
            ),
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("hugoHint")}</p>
        <code className="block overflow-x-auto rounded bg-white/5 px-2 py-1 text-[11px] text-muted-foreground">
          {HUGO_SCHEMA_SNIPPET}
        </code>
      </Block>

      {/* Schema */}
      <Block
        icon={Code2}
        title={t("schemaTitle")}
        action={
          editable && (
            <GenerateButton
              busy={busy === "schema"}
              disabled={locked}
              label={schema ? t("regenerate") : t("generate")}
              onClick={() => run("schema", () => buildSchemaForArticle(ids), (r) => "schemaJsonLd" in r && setSchema(r.schemaJsonLd))}
            />
          )
        }
      >
        <p className="text-xs text-muted-foreground">{t("schemaHint")}</p>
        {schema && <CopyBlock text={schema} mono />}
      </Block>

      {/* Social */}
      <Block
        icon={Share2}
        title={t("socialTitle")}
        action={
          editable && (
            <GenerateButton
              busy={busy === "social"}
              disabled={locked}
              label={social ? t("regenerate") : t("generate")}
              onClick={() => run("social", () => generateSocialPosts(ids), (r) => "social" in r && setSocial(r.social))}
            />
          )
        }
      >
        {social ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Labeled label="X / Twitter">
              <CopyBlock text={(social.x_thread ?? []).join("\n\n")} />
            </Labeled>
            <Labeled label="LinkedIn">
              <CopyBlock text={social.linkedin ?? ""} />
            </Labeled>
            <Labeled label="Instagram">
              <CopyBlock text={social.instagram ?? ""} />
            </Labeled>
            <Labeled label="Pinterest">
              <CopyBlock text={social.pinterest ?? ""} />
            </Labeled>
            <Labeled label="WhatsApp">
              <CopyBlock text={social.whatsapp ?? ""} />
            </Labeled>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("socialHint")}</p>
        )}
      </Block>

      {/* Newsletter */}
      <Block
        icon={Mail}
        title={t("newsletterTitle")}
        action={
          editable && (
            <GenerateButton
              busy={busy === "newsletter"}
              disabled={locked}
              label={newsletter ? t("regenerate") : t("generate")}
              onClick={() =>
                run("newsletter", () => generateNewsletterExcerpt(ids), (r) => "newsletter" in r && setNewsletter(r.newsletter))
              }
            />
          )
        }
      >
        {newsletter ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Labeled label={t("short")}>
              <CopyBlock text={newsletter.short ?? ""} />
            </Labeled>
            <Labeled label={t("long")}>
              <CopyBlock text={newsletter.long ?? ""} />
            </Labeled>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("newsletterHint")}</p>
        )}
      </Block>
    </section>
  );
}

function Block({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Send;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-white/5 pt-4 first-of-type:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Icon className="size-3.5 text-violet-300" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function GenerateButton({
  busy,
  disabled,
  label,
  onClick,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" size="sm" disabled={disabled} onClick={onClick}>
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {label}
    </Button>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function CopyBlock({ text, mono = false }: { text: string; mono?: boolean }) {
  const t = useTranslations("content.distribution");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (http, permissions): the text is still selectable.
    }
  };
  return (
    <div className="relative">
      <pre
        className={`max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-3 pr-10 text-xs ${
          mono ? "font-mono" : "font-sans"
        }`}
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        title={t("copy")}
        aria-label={t("copy")}
      >
        {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

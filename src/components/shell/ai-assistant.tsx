"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  HelpCircle,
  Send,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Wrench,
} from "lucide-react";
import { chat, decideAssistantAction, type ChatMessage } from "@/app/assistant/actions";
import type { PendingAction, ToolStep } from "@/lib/assistant/engine";

type Proposal = PendingAction & { state: "open" | "done" | "cancelled" | "error"; note?: string };
type UiMessage = ChatMessage & { steps?: ToolStep[]; proposal?: Proposal };

/** The client the page is about, from /clients/12 or any …/c/12 route. */
function clientIdFromPath(path: string): number | null {
  const m = /\/(?:clients|c)\/(\d+)(?:\/|$)/.exec(path);
  return m ? Number(m[1]) : null;
}

const SUGGESTIONS = ["worstScore", "commonIssue", "strikingDistance", "focusFirst"] as const;

type T = ReturnType<typeof useTranslations<"shell.assistant">>;

function pathToFriendly(path: string, t: T): string {
  if (path === "/") return t("pages.dashboard");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "clients" && parts[1]) return t("pages.client");
  if (parts[0] === "tools" && parts[1])
    return t("pages.tool", { name: parts[1].replace(/-/g, " ") });
  if (parts[0] === "audits") return t("pages.audit");
  if (parts[0] === "keywords") return t("pages.keywords");
  if (parts[0] === "backlinks" || parts[0] === "link-building")
    return t("pages.backlinks");
  if (parts[0] === "competitors") return t("pages.competitors");
  if (parts[0] === "content") return t("pages.content");
  if (parts[0] === "reports") return t("pages.reports");
  return t("pages.other", { name: parts[0] ?? "" });
}

const OPEN_ASSISTANT_EVENT = "rf:open-assistant";

/** Opens the assistant chat from anywhere (the sidebar footer uses it). */
export function openAssistant() {
  window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT));
}

export type AskDetail = { question: string; context?: string; clientId?: number | null };
const ASK_EVENT = "rf:ask-assistant";

/** Opens the assistant and asks a question about something on screen (AskAiButton). */
export function askAssistant(detail: AskDetail) {
  window.dispatchEvent(new CustomEvent<AskDetail>(ASK_EVENT, { detail }));
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const t = useTranslations("shell.assistant");
  const pageContext = pathToFriendly(pathname, t);

  // Scroll to bottom on new message
  // The sidebar's assistant button (bottom of the rail on md+) opens the
  // same chat through this event, so the chat and its state stay here.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const send = (text: string, opts: { clientId?: number | null } = {}) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const next: UiMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(next);
    setInput("");
    setError(null);
    startTransition(async () => {
      const r = await chat(
        next.map((m) => ({ role: m.role, content: m.content })),
        { clientId: opts.clientId ?? clientIdFromPath(pathname), conversationId },
      );
      if (r.ok) {
        setConversationId(r.conversationId);
        setMessages([
          ...next,
          r.pending
            ? {
                role: "assistant",
                // What the model reads next turn: it proposed this.
                content: r.reply || `[proposed, waiting for confirmation] ${r.pending.summary}`,
                steps: r.steps,
                proposal: { ...r.pending, state: "open" },
              }
            : { role: "assistant", content: r.reply, steps: r.steps },
        ]);
        setProvider(r.provider);
      } else {
        setError(r.error);
        // Don't add assistant message on error
      }
    });
  };

  // « Demander à l'IA » buttons: open and ask straight away, with the
  // item's context under the question.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    const onAsk = (e: Event) => {
      const d = (e as CustomEvent<AskDetail>).detail;
      if (!d?.question) return;
      setOpen(true);
      const text = d.context ? `${d.question}\n\n---\n${d.context.slice(0, 3000)}` : d.question;
      sendRef.current(text, { clientId: d.clientId });
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  return (
    <>
      {/*
        Single floating AI trigger. Was two buttons + a perpetual
        animate-ping; the ping was a constant visual nag and the
        secondary "I'm stuck" button was just a pre-filled question.
        Now it's one bubble; "I'm stuck" lives inside the chat as a
        quick-action button shown when the conversation is empty.
      */}
      <div
        // Phones only: from md up the sidebar is visible and its footer
        // carries the assistant button, so nothing floats over the page.
        className="fixed bottom-3 right-3 z-40 sm:bottom-5 sm:right-5 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("open")}
          title={t("openTitle")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 text-white shadow-xl shadow-violet-500/40 ring-1 ring-inset ring-white/30 transition-transform hover:scale-110"
        >
          <Sparkles className="size-5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden
          />
          <div
            className="relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-2xl shadow-violet-500/20 backdrop-blur-xl sm:h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 shadow-md shadow-violet-500/30 ring-1 ring-inset ring-white/30">
                  <Bot className="size-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{t("title")}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {provider
                      ? t("poweredBy", { provider })
                      : t("askAnything")}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 ring-1 ring-violet-500/30">
                    <Sparkles className="size-6 text-violet-300" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">
                      {t("emptyTitle")}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      {t("emptyBody")}
                    </p>
                  </div>
                  <div className="grid w-full max-w-md gap-2 pt-2">
                    {/* "I'm stuck" was a separate floating button; now
                        a first-class quick action inside the chat when
                        the conversation is empty. */}
                    <button
                      type="button"
                      onClick={() =>
                        send(
                          t("stuckPrompt", { page: pageContext, path: pathname }),
                        )
                      }
                      className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200 transition-colors hover:bg-amber-500/15"
                    >
                      <HelpCircle className="size-3.5 shrink-0" />
                      {t("stuck")}
                    </button>
                    {SUGGESTIONS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => send(t(`suggestions.${key}`))}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-foreground/85 transition-colors hover:border-white/20 hover:bg-white/10"
                      >
                        {t(`suggestions.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ul className="space-y-4">
                  {messages.map((m, i) => (
                    <Bubble
                      key={i}
                      message={m}
                      busy={pending}
                      onDecide={(approve) => {
                        const p = m.proposal;
                        if (!p || p.state !== "open") return;
                        startTransition(async () => {
                          const r = await decideAssistantAction(p.id, approve);
                          setMessages((all) =>
                            all.map((x, j) =>
                              j === i && x.proposal
                                ? {
                                    ...x,
                                    content: `${x.content}\n[${r.ok ? r.status : "failed"}] ${r.ok ? r.message : r.error}`,
                                    proposal: {
                                      ...x.proposal,
                                      state: r.ok ? (r.status === "approved" ? "done" : "cancelled") : "error",
                                      note: r.ok ? r.message : r.error,
                                    },
                                  }
                                : x,
                            ),
                          );
                        });
                      }}
                    />
                  ))}
                  {pending && (
                    <li className="flex items-start gap-3">
                      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 shadow-md shadow-violet-500/30 ring-1 ring-inset ring-white/30">
                        <Bot className="size-3.5 text-white" />
                      </div>
                      <div className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm">
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {error && (
              <div className="mx-5 mb-2 flex items-start gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              className="flex shrink-0 items-end gap-2 border-t border-white/5 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder={t("placeholder")}
                disabled={pending}
                className="max-h-32 flex-1 resize-none rounded-lg border border-white/10 bg-card/60 px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={pending || input.trim().length === 0}
                aria-label={t("send")}
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 text-white shadow-md shadow-violet-500/30 ring-1 ring-inset ring-white/20 transition-opacity disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({
  message,
  busy,
  onDecide,
}: {
  message: UiMessage;
  busy: boolean;
  onDecide: (approve: boolean) => void;
}) {
  const t = useTranslations("shell.assistant");
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-violet-500/15 px-4 py-2.5 text-sm ring-1 ring-inset ring-violet-500/30">
          {message.content}
        </div>
      </li>
    );
  }
  const p = message.proposal;
  // The proposed change is shown in its own card, not as something looked at.
  const steps = (message.steps ?? []).filter((s) => s.ok);
  if (p) steps.pop();
  const used = Array.from(new Set(steps.map((s) => s.tool)));
  const label = (tool: string) => (t.has(`tools.${tool}`) ? t(`tools.${tool}`) : tool);
  const text = p ? message.content.replace(/^\[proposed[^\]]*\][^\n]*\n?/, "").replace(/\n?\[(approved|rejected|failed)\][^\n]*$/, "") : message.content;
  return (
    <li className="flex items-start gap-3">
      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 shadow-md shadow-violet-500/30 ring-1 ring-inset ring-white/30">
        <Bot className="size-3.5 text-white" />
      </div>
      <div className="min-w-0 max-w-[85%] space-y-2">
        {used.length > 0 ? (
          <div className="inline-flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            <Wrench className="size-3" aria-hidden />
            {t("usedTools", { tools: used.map(label).join(", ") })}
          </div>
        ) : null}
        {text.trim() ? (
          <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/5 px-4 py-2.5 text-sm leading-relaxed">
            {text}
          </div>
        ) : null}
        {p ? (
          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="font-medium">{t("proposalTitle")} : {label(p.tool)}</div>
            <div className="break-words font-mono text-xs text-muted-foreground">{p.summary}</div>
            {p.state === "open" ? (
              <>
                <p className="m-0 text-xs text-muted-foreground">{t("proposalHint")}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDecide(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:opacity-60"
                  >
                    <Check className="size-3.5" />
                    {t("confirm")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDecide(false)}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs hover:bg-accent disabled:opacity-60"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </>
            ) : (
              <p className={`m-0 text-xs ${p.state === "error" ? "text-rose-500" : "text-muted-foreground"}`}>{p.note}</p>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

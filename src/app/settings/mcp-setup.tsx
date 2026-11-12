"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  installDesktopConfig,
  type InstallResult,
} from "./desktop-config-actions";

/**
 * Per-client setup instructions for connecting a chat app to this tool.
 *
 * Split by client because the answer genuinely differs, and the
 * difference is the thing people get stuck on: Claude Desktop, Claude
 * Code and Cursor run on this machine and can reach localhost, so they
 * work with no tunnel at all. claude.ai and ChatGPT run on their own
 * servers and call you, so they cannot reach localhost under any
 * configuration and need a public HTTPS address.
 *
 * Every command is rendered with the real port, the real install path
 * and the real token already in it. The previous version printed
 * "<path to this folder>" and left the reader to work it out.
 */

type ClientId = "claude-code" | "claude-desktop" | "cursor" | "web";

const TABS: { id: ClientId; label: string; local: boolean }[] = [
  { id: "claude-code", label: "Claude Code", local: true },
  { id: "claude-desktop", label: "Claude Desktop", local: true },
  { id: "cursor", label: "Cursor", local: true },
  { id: "web", label: "claude.ai / ChatGPT", local: false },
];

function Block({ text }: { text: string }) {
  const tx = useTranslations("ui.app_settings_mcp-setup");
  const [done, setDone] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-3 pr-20 text-[11px] leading-relaxed text-foreground">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1800);
          });
        }}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] shadow-sm hover:border-foreground/25"
      >
        {done ? <Check className="size-3" /> : <Copy className="size-3" />}
        {done ? tx("copied") : tx("copy")}
      </button>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((node, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-violet-500/15 text-[10px] font-semibold text-violet-300 ring-1 ring-inset ring-violet-500/30">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5 text-xs leading-relaxed">
            {node}
          </div>
        </li>
      ))}
    </ol>
  );
}

function DocLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-violet-300 underline decoration-dotted underline-offset-2 hover:decoration-solid"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

export function McpSetup({
  token,
  origin,
  installPath,
  platform,
  nodePath,
  connectedTab,
  connectedClient,
}: {
  token: string | null;
  origin: string;
  installPath: string;
  /** process.platform from the server — picks the right paths. */
  platform: string;
  /** process.execPath — the node binary already running this app. */
  nodePath: string;
  /** Which tab is actually connected, from the client name it sent. */
  connectedTab: ClientId | null;
  /** That client, verbatim, e.g. "claude-ai 0.1.0". */
  connectedClient: string | null;
}) {
  const tx = useTranslations("ui.app_settings_mcp-setup");
  const [tab, setTab] = useState<ClientId>("claude-code");
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState<InstallResult | null>(null);
  const url = `${origin}/api/mcp`;
  const tok = token ?? "<generate a token above first>";

  // Windows paths contain backslashes, which are escapes inside a JSON
  // string. Emitting the raw path produced a config file the client
  // refused to parse.
  const jsonPath = JSON.stringify(installPath);

  // Absolute paths to node and to the local tsx, not "npx".
  //
  // "npx" is what the docs use and it fails on Windows in a way that
  // reads as a bug in this app: a desktop app does not inherit the PATH
  // your shell has, and on Windows npx resolves to npx.ps1 — a
  // PowerShell script a packaged (Store) build often cannot execute. The
  // result is "Server disconnected" with no useful message. Naming the
  // node binary and the tsx entry point outright removes every lookup,
  // and also stops npx reaching for the network to resolve tsx.
  const sep = platform === "win32" ? "\\" : "/";
  const join = (...parts: string[]) => parts.join(sep);
  const tsxCli = join(installPath, "node_modules", "tsx", "dist", "cli.mjs");
  const serverScript = join(installPath, "scripts", "mcp-server.ts");
  const tsconfig = join(installPath, "tsconfig.json");
  const dbPath = join(installPath, "data.db");

  // --tsconfig and SEO_DB_PATH are not optional extras. Claude Desktop
  // does not run the server in the `cwd` the config asks for, and both
  // of these resolve relative to the working directory:
  //
  //   tsx finds tsconfig from cwd, so "@/db/client" failed to resolve
  //   and the process died with MODULE_NOT_FOUND;
  //   the database path defaults to cwd, so it then tried to open
  //   C:\data.db and died with "unable to open database file".
  //
  // Both were reproduced by launching with cwd set elsewhere, and the
  // pair of them together makes the server start regardless of cwd.
  const serverEntry = `    "seo-tool": {
      "command": ${JSON.stringify(nodePath)},
      "args": [
        ${JSON.stringify(tsxCli)},
        "--tsconfig",
        ${JSON.stringify(tsconfig)},
        ${JSON.stringify(serverScript)}
      ],
      "cwd": ${jsonPath},
      "env": { "SEO_DB_PATH": ${JSON.stringify(dbPath)} }
    }`;

  const desktopConfig = `{
  "mcpServers": {
${serverEntry}
  }
}`;

  // Shown for the case the official quickstart skips: a config that
  // already has servers. Its instruction is "replace the contents of the
  // file", which is right for a first server and quietly deletes every
  // other one after that.
  const mergeExample = `{
  "mcpServers": {
    "some-server-you-already-have": { "command": "..." },
${serverEntry}
  }
}`;

  const isWindows = platform === "win32";
  const configPath = isWindows
    ? "%APPDATA%\\Claude\\claude_desktop_config.json"
    : "~/Library/Application Support/Claude/claude_desktop_config.json";
  const logPath = isWindows
    ? 'type "%APPDATA%\\Claude\\logs\\mcp*.log"'
    : "tail -n 20 -f ~/Library/Logs/Claude/mcp*.log";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/60 p-3">
      <div>
        <p className="text-xs font-medium">{tx("connectYourChatApp")}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {tx("theFirstThreeRunOn")}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
              tab === t.id
                ? "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-500/30"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            {t.label}
            {/* The one that is actually connected says so. Four tabs
                that all look identical cannot answer "which of these am
                I using?", which is the first thing anyone asks after
                setting one up. */}
            {connectedTab === t.id ? (
              <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] uppercase text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {tx("connected")}
              </span>
            ) : (
              t.local && (
                <span className="ml-1.5 text-[9px] uppercase text-emerald-400/70">
                  {tx("noSetup")}
                </span>
              )
            )}
          </button>
        ))}
      </div>

      {/* What to do once it says connected. "Connected" is a claim
          about a handshake; asking it something is the only thing that
          proves the tools actually answer. */}
      {connectedTab && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-100/90">
          <strong>
            {tx("connectedVia", { label: TABS.find((t) => t.id === connectedTab)?.label ?? "" })}
          </strong>
          {connectedClient ? tx("identifiedAs", { name: connectedClient }) : "."}{" "}
          {tx.rich("toCheckTheToolsReally", { b0: (chunks) => <em>{chunks}</em> })}
        </div>
      )}
      {tab === "claude-code" && (
        <Steps
          items={[
            <>
              <p>{tx("runThisInATerminal")}</p>
              <Block
                text={`claude mcp add -t http seo-tool ${url} -H "Authorization: Bearer ${tok}"`}
              />
            </>,
            <>
              <p>
                {tx.rich("typeMcpInsideClaudeCode", { b0: (chunks) => <code className="rounded bg-muted px-1">{chunks}</code> })}
              </p>
            </>,
            <>
              <p>
                <DocLink href="https://code.claude.com/docs/en/mcp">
                  {tx("claudeCodeMcpDocumentation")}
                </DocLink>
              </p>
            </>,
          ]}
        />
      )}

      {(tab === "claude-desktop" || tab === "cursor") && (
        <>
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-100/90">
            {tx.rich("noTunnelNoCloudflareNo", { b0: (chunks) => <strong>{chunks}</strong> })}
          </p>

          {/* Offered before the manual steps, because hand-editing this
              file is where it goes wrong: a snippet pasted at the end
              makes two JSON objects and the app refuses to start with a
              parse error that names a byte offset. Merging in code
              cannot produce invalid JSON. */}
          {tab === "claude-desktop" && (
            <div className="space-y-2 rounded-lg border border-violet-500/30 bg-violet-500/[0.07] p-3">
              <p className="text-xs font-medium">{tx("doItForMe")}</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {tx("writesTheConfigKeepingAny")}
              </p>
              <button
                type="button"
                disabled={installing}
                onClick={() => {
                  setInstalling(true);
                  setInstalled(null);
                  void installDesktopConfig().then((r) => {
                    setInstalled(r);
                    setInstalling(false);
                  });
                }}
                className="inline-flex h-8 items-center rounded-lg bg-violet-500/20 px-3 text-xs font-medium text-violet-200 ring-1 ring-inset ring-violet-500/40 hover:bg-violet-500/30 disabled:opacity-50"
              >
                {installing ? tx("writing") : tx("writeTheConfigForMe")}
              </button>

              {installed?.ok && (
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <p className="text-emerald-600 dark:text-emerald-300">
                    {tx("done")} {installed.replaced ? "updated" : "added"} {tx.rich("seoToolServersNowConfigured", { v: installed.servers.join(", "), b0: (chunks) => <strong>{chunks}</strong> })}
                  </p>
                  <p className="text-muted-foreground">
                    {tx("wrote", { configPath: installed.configPath })}
                    {installed.backupPath
                      ? tx("previousVersionSavedAlongsideIt")
                      : "."}
                  </p>
                  <p className="text-foreground">
                    {tx("nowQuitClaudeDesktopCompletely")}
                  </p>
                </div>
              )}
              {installed && !installed.ok && (
                <p className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-300">
                  {installed.error}
                </p>
              )}
            </div>
          )}
          <Steps
            items={[
              <>
                {tab === "claude-desktop" ? (
                  <>
                    <p>
                      {tx.rich("openTheClaudeMenuIn", { b0: (chunks) => <strong>{chunks}</strong>, b1: (chunks) => <strong>{chunks}</strong> })}
                    </p>
                    <p className="text-muted-foreground">
                      {tx("thatOpensAndCreatesIf")}
                    </p>
                    <Block text={configPath} />
                    {isWindows && (
                      <p className="text-muted-foreground">
                        {tx.rich("installedFromTheMicrosoftStore", { b0: (chunks) => <code className="rounded bg-muted px-1">{chunks}</code> })}
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    {tx.rich("openSettingsMcpAddNew", { b0: (chunks) => <strong>{chunks}</strong>, b1: (chunks) => <code>{chunks}</code> })}
                  </p>
                )}
              </>,
              <>
                <p>
                  {tx.rich("ifTheFileIsEmpty", { b0: (chunks) => <strong>{chunks}</strong> })}
                </p>
                <Block text={desktopConfig} />
              </>,
              <>
                <p>
                  {tx.rich("ifItAlreadyHasServers", { b0: (chunks) => <strong>{chunks}</strong>, b1: (chunks) => <code>{chunks}</code>, b2: (chunks) => <code>{chunks}</code> })}
                </p>
                <Block text={mergeExample} />
                <p className="text-muted-foreground">
                  {tx("itIsOneJsonObject")}
                </p>
              </>,
              <>
                <p>
                  <strong>{tx("quitCompletelyAndReopen")}</strong>{" "}
                  {tab === "claude-desktop"
                    ? tx("closingTheWindowIsNot")
                    : tx("reloadTheWindow")}{tx("configIsOnlyReadAt")}
                </p>
              </>,
              <>
                {tab === "claude-desktop" ? (
                  <p>
                    {tx.rich("checkItWorkedClickAdd", { b0: (chunks) => <strong>{chunks}</strong>, b1: (chunks) => <strong>{chunks}</strong>, b2: (chunks) => <code>{chunks}</code> })}
                  </p>
                ) : (
                  <p>
                    {tx.rich("checkItWorkedSettingsMcp", { b0: (chunks) => <strong>{chunks}</strong>, b1: (chunks) => <code>{chunks}</code> })}
                  </p>
                )}
              </>,
              <>
                <p>
                  {tx("ifItDoesNotAppear")}
                </p>
                <Block text={logPath} />
                <p className="text-muted-foreground">
                  {tx("mostOftenInvalidJsonOr")}
                </p>
              </>,
              <>
                <p>
                  {tab === "claude-desktop" ? (
                    <DocLink href="https://modelcontextprotocol.io/quickstart/user">
                      {tx("claudeDesktopMcpQuickstart")}
                    </DocLink>
                  ) : (
                    <DocLink href="https://docs.cursor.com/context/model-context-protocol">
                      {tx("cursorMcpDocumentation")}
                    </DocLink>
                  )}
                </p>
              </>,
            ]}
          />
        </>
      )}

      {tab === "web" && (
        <div className="space-y-2.5">
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-100/90">
            {tx.rich("whyThisOneIsDifferent", { b0: (chunks) => <strong>{chunks}</strong>, b1: (chunks) => <em>{chunks}</em>, b2: (chunks) => <code>{chunks}</code>, b3: (chunks) => <code>{chunks}</code> })}
          </p>
          <Steps
            items={[
              <>
                <p>
                  {tx("installCloudflared")}
                  <DocLink href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/">
                    {tx("downloadPage")}
                  </DocLink>
                  {tx("freeAndNoAccountNeeded")}
                </p>
              </>,
              <>
                <p>{tx("runThisAndLeaveIt")}</p>
                <Block text={`cloudflared tunnel --url ${origin}`} />
                <p className="text-muted-foreground">
                  {tx("itPrintsAnHttpsTrycloudflare")}
                </p>
              </>,
              <>
                <p>
                  {tx.rich("inClaudeAiGoTo", { b0: (chunks) => <code className="rounded bg-muted px-1">{chunks}</code> })}
                </p>
              </>,
              <>
                <p>
                  {tx.rich("giveItTheTokenAs", { b0: (chunks) => <code className="rounded bg-muted px-1">{chunks}</code> })}
                  <DocLink href="https://claude.com/docs/connectors/custom/remote-mcp">
                    {tx("requestHeaderAuthentication")}
                  </DocLink>{tx("currentlyInBetaAndSet")}
                </p>
              </>,
            ]}
          />
          <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] leading-relaxed text-rose-900 dark:text-rose-100/90">
            {tx.rich("worthKnowingBeforeYouDo", { b0: (chunks) => <strong>{chunks}</strong> })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {tx("anthropicAlsoHasAnOfficial")}
            <DocLink href="https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/quickstart">
              {tx("mcpTunnels")}
            </DocLink>{tx("previewOutboundOnlySoNothing")}
          </p>
        </div>
      )}
    </div>
  );
}

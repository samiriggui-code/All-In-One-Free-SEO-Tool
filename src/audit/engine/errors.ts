export type AuditErrorCode =
  | "dns"
  | "unreachable"
  | "tls"
  | "timeout"
  | "non-html"
  | "http-error"
  | "playwright-missing"
  | "no-pages"
  | "config"
  | "aborted"
  | "blocked"
  | "unknown";

export const HINTS: Partial<Record<AuditErrorCode, string>> = {
  dns: "Check the hostname for typos and that you are online.",
  unreachable:
    "Nothing answered at that address. Check the URL and port, that the site is running, and any firewall or proxy in between.",
  tls: "The HTTPS certificate was rejected. Check it is valid for this hostname and not expired, or audit the http:// URL if the site has no certificate.",
  timeout: "Try again, or run a quick audit instead of a full one.",
  "non-html": "Point the audit at an HTML page rather than a file, API or feed.",
  "http-error": "Make sure the URL is publicly reachable and returns 200.",
  "playwright-missing":
    "Install the browser (`pnpm exec playwright install chromium`), or run a quick audit, which needs no browser.",
  "no-pages":
    "The crawl found nothing to audit. Check robots.txt and that the start URL links to other pages.",
  blocked:
    "Audits run on the server, so they can only reach addresses that are reachable from the public internet.",
};

export class AuditError extends Error {
  code: AuditErrorCode;
  /** What the user can do about it, when there is something */
  hint?: string;
  constructor(
    code: AuditErrorCode,
    message: string,
    options: { cause?: unknown; hint?: string } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AuditError";
    this.code = code;
    this.hint = options.hint ?? HINTS[code];
  }
}

export class AuditAbortedError extends AuditError {
  constructor(message = "Audit cancelled") {
    super("aborted", message);
    this.name = "AuditAbortedError";
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof AuditAbortedError) return true;
  if (typeof error !== "object" || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === "AbortError" || code === "ABORT_ERR";
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AuditAbortedError();
}

export function rethrowIfAborted(error: unknown, signal?: AbortSignal): void {
  if (error instanceof AuditAbortedError) throw error;
  if (signal?.aborted) throw new AuditAbortedError();
}

export function classifyError(error: unknown): AuditError {
  if (error instanceof AuditError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? (error.cause as { code?: string; message?: string } | undefined) : undefined;
  const causeCode = cause?.code ?? "";
  const text = `${message} ${causeCode}`;
  if (isAbortError(error)) return new AuditAbortedError();
  if (error instanceof Error && error.name === "SsrfBlockedError") {
    return new AuditError("blocked", message, { cause: error });
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(text)) {
    return new AuditError("dns", `Could not resolve the hostname: ${message}`, { cause: error });
  }
  if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EPIPE|UND_ERR_SOCKET/.test(causeCode)) {
    return new AuditError(
      "unreachable",
      `Could not connect to the site (${causeCode}): ${cause?.message ?? message}`,
      { cause: error },
    );
  }
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS|ERR_SSL/.test(causeCode)) {
    return new AuditError("tls", `The site's TLS certificate was rejected (${causeCode})`, { cause: error });
  }
  if (/TimeoutError|timed out|timeout|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT/i.test(text)) {
    return new AuditError("timeout", `The site did not respond in time: ${message}`, { cause: error });
  }
  if (/Executable doesn't exist|browserType\.launch|playwright install|Failed to launch/i.test(text)) {
    return new AuditError("playwright-missing", `The browser could not be started: ${message}`, { cause: error });
  }
  return new AuditError("unknown", message, { cause: error });
}

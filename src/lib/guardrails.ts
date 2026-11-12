/**
 * Local guardrails: checks run on every AI call, before the prompt leaves
 * the server and after the answer comes back. Nothing here calls a model,
 * so the checks are instant, free and work offline.
 *
 * What they look for:
 *   - secrets pasted into a prompt (API keys, tokens, private keys);
 *   - bank details: IBANs (checked with their mod-97 key) and card
 *     numbers (checked with the Luhn key), so an order number that only
 *     looks like a card is left alone;
 *   - the workspace's own blocked terms (Settings → AI → Guardrails);
 *   - attempts to override the instructions ("ignore previous
 *     instructions", "ignore les instructions précédentes").
 *
 * The mode decides what happens:
 *   - "off":   nothing is checked;
 *   - "mask":  secrets and bank details are replaced by a placeholder,
 *              blocked terms are masked, override attempts are only logged;
 *   - "block": any finding stops the call.
 *
 * Incidents never store the matched text, only its kind: logging a card
 * number to say we refused to send it would defeat the point.
 */

export type GuardrailMode = "off" | "mask" | "block";

export type FindingKind =
  | "api_key"
  | "private_key"
  | "iban"
  | "card"
  | "blocked_term"
  | "injection";

export type Finding = { kind: FindingKind; start: number; end: number };

export type GuardrailSettings = {
  mode: GuardrailMode;
  blockedTerms: string[];
};

export const DEFAULT_GUARDRAILS: GuardrailSettings = { mode: "mask", blockedTerms: [] };

const PLACEHOLDER: Record<FindingKind, string> = {
  api_key: "[clé masquée]",
  private_key: "[clé privée masquée]",
  iban: "[IBAN masqué]",
  card: "[carte masquée]",
  blocked_term: "[terme masqué]",
  injection: "",
};

// Provider and platform key shapes. Prefixes are distinctive enough that
// a match is almost never ordinary prose.
const API_KEY_PATTERNS: RegExp[] = [
  /\bsk-ant-[A-Za-z0-9_-]{20,}/g, // Anthropic
  /\bsk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{20,}/g, // OpenAI, OpenRouter
  /\bAIza[0-9A-Za-z_-]{35}\b/g, // Google
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, // GitHub
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, // Slack
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\bgsk_[A-Za-z0-9]{40,}\b/g, // Groq
  /\bhf_[A-Za-z0-9]{30,}\b/g, // Hugging Face
  /\bBearer\s+[A-Za-z0-9._~+/-]{30,}=*/g,
];

const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g;

// Country code, two check digits, then 11 to 30 letters or digits, with
// the spaces people type every four characters.
const IBAN_CANDIDATE = /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g;

// 13 to 19 digits, optionally grouped by spaces or dashes.
const CARD_CANDIDATE = /\b\d(?:[ -]?\d){12,18}\b/g;

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions|rules|prompts?)\b/gi,
  /\bdisregard (?:all |any )?(?:the )?(?:previous|prior|above|system) (?:instructions|rules|prompts?)\b/gi,
  /\b(?:reveal|print|show|repeat) (?:me )?(?:your|the) (?:system prompt|hidden instructions)\b/gi,
  /\bignore[sz]? (?:toutes )?(?:les |tes |vos )?(?:instructions|consignes|règles) (?:précédentes|ci-dessus|antérieures)\b/gi,
  /\boublie[sz]? (?:toutes )?(?:les |tes |vos )?(?:instructions|consignes|règles)(?: précédentes)?\b/gi,
  /\b(?:montre|affiche|révèle|répète)[sz]?(?:-moi)? (?:ton|votre|le) (?:prompt système|prompt systeme|instructions cachées)\b/gi,
];

/** ISO 13616 check: move the first four characters to the end, letters to numbers, mod 97 = 1. */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const code = ch.charCodeAt(0);
    const digits = code >= 65 ? String(code - 55) : ch;
    for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

/** Luhn check, used by every payment card network. */
export function isValidCard(raw: string): boolean {
  const digits = raw.replace(/[ -]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;
  // A run of one digit passes Luhn for some lengths and is never a card.
  if (/^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collect(text: string, re: RegExp, kind: FindingKind, keep?: (m: string) => boolean): Finding[] {
  const out: Finding[] = [];
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    if (keep && !keep(m[0])) continue;
    out.push({ kind, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}

/** Every finding in `text`, overlaps removed (the earliest, longest wins). */
export function scan(text: string, blockedTerms: string[] = []): Finding[] {
  if (!text) return [];
  const all: Finding[] = [
    ...collect(text, PRIVATE_KEY, "private_key"),
    ...API_KEY_PATTERNS.flatMap((re) => collect(text, re, "api_key")),
    ...collect(text, IBAN_CANDIDATE, "iban", isValidIban),
    ...collect(text, CARD_CANDIDATE, "card", isValidCard),
    ...INJECTION_PATTERNS.flatMap((re) => collect(text, re, "injection")),
  ];
  for (const term of blockedTerms) {
    const t = term.trim();
    if (!t) continue;
    all.push(...collect(text, new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(t)}(?![\\p{L}\\p{N}])`, "giu"), "blocked_term"));
  }
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Finding[] = [];
  for (const f of all) {
    const last = kept[kept.length - 1];
    if (last && f.start < last.end) continue;
    kept.push(f);
  }
  return kept;
}

/** Replace each maskable finding by its placeholder. Override attempts are left in place. */
export function mask(text: string, findings: Finding[]): string {
  let out = "";
  let at = 0;
  for (const f of findings) {
    if (f.kind === "injection") continue;
    out += text.slice(at, f.start) + PLACEHOLDER[f.kind];
    at = f.end;
  }
  return out + text.slice(at);
}

export type GuardResult =
  | { action: "pass"; text: string; findings: [] }
  | { action: "mask"; text: string; findings: Finding[] }
  | { action: "block"; text: string; findings: Finding[] };

/**
 * Apply the guardrails to one piece of text. `direction` matters only for
 * override attempts: those are looked for in what goes to the model, not
 * in what it answers.
 */
export function guardText(
  text: string,
  settings: GuardrailSettings,
  direction: "in" | "out",
): GuardResult {
  if (settings.mode === "off" || !text) return { action: "pass", text, findings: [] };
  const findings = scan(text, settings.blockedTerms).filter(
    (f) => direction === "in" || f.kind !== "injection",
  );
  if (findings.length === 0) return { action: "pass", text, findings: [] };
  if (settings.mode === "block") return { action: "block", text, findings };
  return { action: "mask", text: mask(text, findings), findings };
}

/** Count findings by kind, the only thing an incident records. */
export function summarize(findings: Finding[]): Partial<Record<FindingKind, number>> {
  const out: Partial<Record<FindingKind, number>> = {};
  for (const f of findings) out[f.kind] = (out[f.kind] ?? 0) + 1;
  return out;
}

export function normalizeGuardrails(raw: unknown): GuardrailSettings {
  const r = (raw ?? {}) as Partial<GuardrailSettings>;
  const mode: GuardrailMode =
    r.mode === "off" || r.mode === "block" || r.mode === "mask" ? r.mode : DEFAULT_GUARDRAILS.mode;
  const blockedTerms = Array.isArray(r.blockedTerms)
    ? r.blockedTerms
        .map((t) => String(t ?? "").trim())
        .filter((t) => t.length > 0 && t.length <= 80)
        .slice(0, 100)
    : [];
  return { mode, blockedTerms };
}

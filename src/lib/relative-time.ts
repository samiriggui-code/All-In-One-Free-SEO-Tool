/**
 * Short relative times ("4m ago", "every 6h") in the interface language.
 *
 * `t` is a translator on the `time` namespace, from `useTranslations` or
 * `getTranslations`: this file stays usable on both sides.
 */

type T = (key: string, values?: Record<string, number>) => string;

/** "12s ago", "4m ago", "3h ago", "2d ago", "3w ago", "5mo ago". */
export function shortAgo(ms: number, t: T, opts: { seconds?: boolean } = {}): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return opts.seconds ? t("s", { n: sec }) : t("justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("m", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("h", { n: hr });
  const days = Math.floor(hr / 24);
  if (days < 7) return t("d", { n: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("w", { n: weeks });
  return t("mo", { n: Math.floor(days / 30) });
}

/** Days only past 24 hours: "2d ago" even after several weeks. */
export function shortAgoDays(ms: number, t: T, opts: { seconds?: boolean } = {}): string {
  const days = Math.floor(ms / 86_400_000);
  return days >= 1 ? t("d", { n: days }) : shortAgo(ms, t, opts);
}

/** "every 15m", "every 6h", "every 1d". */
export function shortEvery(ms: number, t: T): string {
  const hours = ms / 3_600_000;
  if (hours >= 24) return t("everyD", { n: Math.round(hours / 24) });
  if (hours >= 1) return t("everyH", { n: Math.round(hours) });
  return t("everyM", { n: Math.round(ms / 60_000) });
}

/** "just now", "4 minutes ago", "3 hours ago", "2 days ago". */
export function longAgo(ms: number, t: T): string {
  const secs = Math.round(ms / 1000);
  if (secs < 60) return t("justNow");
  const mins = Math.round(secs / 60);
  if (mins < 60) return t("minutesAgo", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("hoursAgo", { n: hours });
  return t("daysAgo", { n: Math.round(hours / 24) });
}

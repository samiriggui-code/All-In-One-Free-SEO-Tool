
export function stripInert(html: string) {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|template)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi, "<$1$2></$1>");
}
export const HEAD_START = /<head(?=[\s/>])[^>]*>/gi;
export function countHeadStartTags(html: string) {
  return stripInert(html).match(HEAD_START)?.length ?? 0;
}
export function headSource(html: string) {
  const source = stripInert(html);
  HEAD_START.lastIndex = 0;
  const start = HEAD_START.exec(source);
  if (!start) return null;
  const from = start.index + start[0].length;
  const rest = source.slice(from);
  const end = rest.search(/<\/head\s*>|<body(?=[\s/>])/i);
  return end === -1 ? rest : rest.slice(0, end);
}
export function startTags(source: string) {
  return [...source.matchAll(/<([a-zA-Z][\w-]*)/g)].map((match) => match[1].toLowerCase());
}
export function noscriptBodies(source: string) {
  return [...source.matchAll(/<noscript\b[^>]*>([\s\S]*?)<\/noscript\s*>/gi)].map((match) => match[1]);
}
export function withoutNoscript(source: string) {
  return source.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, "");
}

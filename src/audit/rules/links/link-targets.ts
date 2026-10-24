import type { LinkInfo } from "@/audit/types";

export function withoutFragment(url: string) {
  const hash = url.indexOf("#");
  return hash === -1 ? url : url.slice(0, hash);
}
export function internalLinkTargets(links: LinkInfo[], pageUrl: string) {
  const page = withoutFragment(pageUrl);
  return [
    ...new Set(links.filter((link) => link.isInternal).map((link) => withoutFragment(link.href)))
  ].filter((target) => target !== page);
}

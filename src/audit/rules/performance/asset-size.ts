import type { AssetInfo } from "@/audit/types";

export function assetContentLength(asset: Pick<AssetInfo, "headers">): number | null {
  const raw = asset.headers["content-length"];
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
export function partitionBySizeKnown(candidates: AssetInfo[]) {
  const sized: AssetInfo[] = [];
  const unsized: AssetInfo[] = [];
  for (const asset of candidates) {
    if (assetContentLength(asset) === null) {
      unsized.push(asset);
    } else {
      sized.push(asset);
    }
  }
  return { sized, unsized };
}
export function unsizedReason(count: number, noun: string) {
  return `${count} ${noun}(s) were served without a content-length header (chunked or HTTP/2 framing), so their size could not be read`;
}

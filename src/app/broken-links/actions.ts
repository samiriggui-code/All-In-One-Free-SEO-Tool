"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { findBrokenLinks, type BrokenLinksResult } from "@/lib/broken-links";

export async function checkUrl(url: string): Promise<BrokenLinksResult> {
  await requireSignedIn();
  return findBrokenLinks(url);
}

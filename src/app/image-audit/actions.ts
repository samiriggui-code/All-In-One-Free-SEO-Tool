"use server";

import { requireSignedIn } from "@/lib/action-guard";

import { auditImages, type ImageAuditResult } from "@/lib/image-audit";

export async function runImageAudit(
  url: string,
): Promise<ImageAuditResult> {
  await requireSignedIn();
  return auditImages(url);
}

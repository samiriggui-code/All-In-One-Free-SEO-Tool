import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { contentPosts } from "@/db/schema";
import { displayName, loadBrand } from "@/lib/brand";
import { markdownToHtml } from "@/lib/content-studio/exports/common";
import { portalClient } from "../../portal-client";

export const dynamic = "force-dynamic";

/**
 * An article the agency opened for the client to read before it goes
 * live. Read-only, and only for an article of this portal's client that
 * was explicitly shared (content_posts.review_shared_at): any other id
 * is the same 404 as a bad link.
 */
async function sharedPost(token: string, rawId: string) {
  const client = await portalClient(token);
  const postId = Number(rawId);
  if (!client || !Number.isInteger(postId) || postId <= 0) return null;
  const [post] = await db
    .select()
    .from(contentPosts)
    .where(
      and(
        eq(contentPosts.id, postId),
        eq(contentPosts.clientId, client.id),
        isNotNull(contentPosts.reviewSharedAt),
      ),
    )
    .limit(1);
  return post ? { client, post } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; postId: string }>;
}): Promise<Metadata> {
  const { token, postId } = await params;
  const found = await sharedPost(token, postId);
  const agency = displayName(await loadBrand());
  return {
    title: found?.post.title ?? agency,
    appleWebApp: { capable: true, title: agency },
    // An unlisted draft: never for search engines.
    robots: { index: false, follow: false },
  };
}

export default async function PortalArticlePage({
  params,
}: {
  params: Promise<{ token: string; postId: string }>;
}) {
  const { token, postId } = await params;
  const found = await sharedPost(token, postId);
  if (!found) notFound();
  const { post } = found;

  const [t, locale, brand] = await Promise.all([getTranslations("portal.article"), getLocale(), loadBrand()]);
  // markdownToHtml escapes the text before adding its own tags.
  const html = markdownToHtml(post.draftMarkdown ?? "");
  const published = post.status === "published";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="relative mx-auto max-w-3xl space-y-6 px-6 py-10">
        <Link
          href={`/portal/${token}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          {t("back", { agency: displayName(brand) })}
        </Link>

        <header className="space-y-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
              published
                ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300"
            }`}
          >
            {published ? t("published") : t("draft")}
          </span>
          <h1 className="text-2xl font-semibold leading-tight text-foreground">
            {post.title || post.primaryKeyword}
          </h1>
          <p className="text-xs text-muted-foreground">
            {post.publishDate
              ? t(published ? "publishedOn" : "plannedFor", {
                  date: post.publishDate.toLocaleDateString(locale, { timeZone: "UTC" }),
                })
              : t("noDate")}
          </p>
          {!published && <p className="text-sm text-muted-foreground">{t("hint")}</p>}
        </header>

        {(post.metaTitle || post.metaDescription) && (
          <section className="rounded-2xl border border-border bg-card/40 p-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("google")}</h2>
            {post.metaTitle && <p className="mt-2 text-base font-medium text-primary">{post.metaTitle}</p>}
            {post.metaDescription && <p className="mt-1 text-sm text-muted-foreground">{post.metaDescription}</p>}
          </section>
        )}

        <article
          className="portal-article rounded-2xl border border-border bg-card/40 p-5 sm:p-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { canSeeClient, currentUser } from "@/lib/auth";
import { getPost, listPosts } from "@/lib/content-studio/store";
import { toExportPost, type ClientForExport } from "@/lib/content-studio/article-export";
import { buildWordPressWXR } from "@/lib/content-studio/exports/wordpress-xml";
import { buildGhostJson } from "@/lib/content-studio/exports/ghost";
import { buildWebflowCsv } from "@/lib/content-studio/exports/webflow-csv";
import { buildHugoMarkdown } from "@/lib/content-studio/exports/hugo";

export const dynamic = "force-dynamic";

/**
 * Download a client's articles for a CMS import.
 *
 *   ?format=wordpress|ghost|webflow   every article with a draft, or one with &postId=
 *   ?format=hugo|markdown&postId=N    one article (both are one file per post)
 *
 * Route handlers do not run the per-client layout, so the access check
 * the layout would have done is repeated here.
 */
const FORMATS = {
  wordpress: { ext: "xml", type: "application/xml; charset=utf-8", single: false },
  ghost: { ext: "json", type: "application/json; charset=utf-8", single: false },
  webflow: { ext: "csv", type: "text/csv; charset=utf-8", single: false },
  hugo: { ext: "md", type: "text/markdown; charset=utf-8", single: true },
  markdown: { ext: "md", type: "text/markdown; charset=utf-8", single: true },
} as const;
type Format = keyof typeof FORMATS;

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = Number((await params).clientId);
  const format = req.nextUrl.searchParams.get("format") as Format | null;
  const postIdRaw = req.nextUrl.searchParams.get("postId");
  const postId = postIdRaw ? Number(postIdRaw) : null;
  if (!Number.isInteger(clientId) || !format || !(format in FORMATS)) {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (postId !== null && !Number.isInteger(postId)) return new NextResponse("Bad request", { status: 400 });
  if (FORMATS[format].single && postId === null) return new NextResponse("postId required", { status: 400 });

  if (!(await canSeeClient(await currentUser(), clientId))) return new NextResponse("Not found", { status: 404 });
  const [client] = await db
    .select({ name: clients.name, url: clients.url })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return new NextResponse("Not found", { status: 404 });

  const rows = postId !== null ? [await getPost(clientId, postId)].filter((p) => p !== null) : await listPosts(clientId);
  const posts = rows.filter((p) => p.draftMarkdown?.trim()).map((p) => toExportPost(p, client as ClientForExport));
  if (posts.length === 0) return new NextResponse("Nothing to export yet", { status: 404 });

  let body: string;
  switch (format) {
    case "wordpress":
      body = buildWordPressWXR(posts, client.url, client.name);
      break;
    case "ghost":
      body = buildGhostJson(posts);
      break;
    case "webflow":
      body = buildWebflowCsv(posts, client.name);
      break;
    case "hugo":
      body = buildHugoMarkdown(posts[0]);
      break;
    case "markdown":
      body = posts[0].draftMarkdown;
      break;
  }

  const base = posts.length === 1 ? posts[0].slug : `articles-${client.name}`;
  const filename = `${base.replace(/[^\w.-]+/g, "-").slice(0, 80)}-${format}.${FORMATS[format].ext}`;
  return new NextResponse(body, {
    headers: {
      "content-type": FORMATS[format].type,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

import { guardClientRequest } from "@/lib/admin-auth";
import { loadSpecDocument } from "@/lib/redesign-spec-data";
import { specMarkdown } from "@/lib/redesign-spec-document";

export const dynamic = "force-dynamic";

/**
 * The redesign specification as a Markdown file: what the developers get,
 * to keep in their repository and tick off as they go.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; missionId: string }> }) {
  const { id, missionId } = await ctx.params;
  const projectId = Number(id);
  const mission = Number(missionId);
  if (!Number.isInteger(projectId) || !Number.isInteger(mission)) {
    return new Response("Not found", { status: 404 });
  }
  // The layout guards the project's pages, not its route handlers.
  const forbidden = await guardClientRequest(req, projectId);
  if (forbidden) return forbidden;

  const doc = await loadSpecDocument(projectId, mission);
  if (!doc) return new Response("Not found", { status: 404 });

  return new Response(specMarkdown(doc), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="cahier-des-charges-${projectId}-${mission}.md"`,
    },
  });
}

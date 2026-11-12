/**
 * A team member's profile photo, for the account menu and the team list.
 *
 * Served as an image rather than inlined in /api/auth/status, which every
 * page fetches: the browser caches it under its version (`?v=`), so the
 * photo crosses the wire once per change, not once per page.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Photos are for the people of this workspace, not for the public.
  if (!(await currentUser())) return new Response(null, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 404 });

  const row = db
    .select({ avatar: users.avatar })
    .from(users)
    .where(eq(users.id, id))
    .get();
  const match = row?.avatar?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return new Response(null, { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

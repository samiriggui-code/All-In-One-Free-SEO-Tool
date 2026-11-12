/**
 * Auth status — lets the client know whether signing out is a meaningful
 * action, and who is signed in. Never echoes a password or a session
 * token, and never reveals whether a given email has an account.
 */

import { accountsEnabled, currentUser } from "@/lib/auth";
import { avatarVersion } from "@/app/settings/profile/avatar";

export const dynamic = "force-dynamic";

export async function GET() {
  const accounts = accountsEnabled();
  const user = accounts ? await currentUser() : null;
  return Response.json({
    enabled: accounts || Boolean(process.env.APP_PASSWORD),
    mode: accounts ? "accounts" : process.env.APP_PASSWORD ? "password" : "open",
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          // A URL, not the image: see /api/auth/avatar/[id].
          avatarUrl: user.avatar
            ? `/api/auth/avatar/${user.id}?v=${avatarVersion(user.avatar)}`
            : null,
        }
      : null,
  });
}

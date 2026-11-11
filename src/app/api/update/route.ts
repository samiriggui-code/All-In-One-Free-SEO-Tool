/**
 * Update endpoint — checks GitHub for a newer commit + applies it.
 *
 *   GET  → reports local vs remote SHA, computes updateAvailable.
 *   POST → fast-forwards `main` to origin (never resets or deletes
 *          anything), runs `pnpm install` if package.json changed,
 *          applies new migrations, logs to activity, and tells the UI
 *          whether a manual restart is needed.
 *
 * Most updates don't need a manual restart because Next.js dev mode
 * hot-reloads file changes. Server-only code (lib/, route.ts) often
 * picks up on next request. We flag `restartRecommended: true` only
 * when package.json changed.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { logActivity } from "@/lib/activity";
import { guardOwnerRequest } from "@/lib/admin-auth";
import { REPO_SLUG } from "@/lib/repo";

const exec = promisify(execFile);

export const dynamic = "force-dynamic";
// Required: spawns git + pnpm + reads package.json. Edge can't.
export const runtime = "nodejs";

const BRANCH = "main";

/**
 * The repository this checkout actually pulls from: its `origin` remote.
 *
 * This used to be REPO_SLUG, the upstream project. On a fork that meant the
 * card compared the install against the upstream author's commits (and so
 * always offered an "update") while the pull itself fetched the fork's
 * origin: the version shown and the version applied were two different
 * repositories. Falls back to REPO_SLUG when origin is missing or is not a
 * GitHub URL.
 */
async function getRepoSlug(): Promise<string> {
  try {
    const { stdout } = await exec("git", ["remote", "get-url", "origin"], {
      cwd: process.cwd(),
    });
    const m = stdout.trim().match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/);
    if (m) return m[1];
  } catch {
    // no git, or no origin remote
  }
  return REPO_SLUG;
}

async function getCurrentBranch(): Promise<string | null> {
  try {
    const { stdout } = await exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: process.cwd(),
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function getLocalSha(): Promise<string | null> {
  try {
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
    });
    return stdout.trim();
  } catch {
    try {
      const head = readFileSync(path.join(process.cwd(), ".git", "HEAD"), "utf-8").trim();
      if (head.startsWith("ref: ")) {
        const ref = head.slice(5);
        const sha = readFileSync(path.join(process.cwd(), ".git", ref), "utf-8").trim();
        return sha;
      }
      return head;
    } catch {
      return null;
    }
  }
}

async function getRemoteSha(repo: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits/${BRANCH}`,
      {
        headers: { accept: "application/vnd.github+json" },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { sha?: string };
    return data.sha ?? null;
  } catch {
    return null;
  }
}

/**
 * Is the local checkout actually behind the given remote commit?
 *
 *   true  — the remote commit is not in our history, so there is
 *           genuinely something to pull.
 *   false — the remote commit is already an ancestor of HEAD, so we are
 *           level or ahead. Nothing to pull.
 *   null  — cannot tell: the commit isn't in this clone (never fetched),
 *           or git isn't available. The caller treats that as "offer the
 *           update", since not having the commit is itself a reason to
 *           fetch.
 */
async function isBehind(remote: string): Promise<boolean | null> {
  const cwd = process.cwd();
  try {
    // Do we even have this object? Without it --is-ancestor just errors,
    // and an error would be indistinguishable from "not an ancestor".
    await exec("git", ["cat-file", "-e", `${remote}^{commit}`], { cwd });
  } catch {
    return null;
  }
  try {
    await exec("git", ["merge-base", "--is-ancestor", remote, "HEAD"], { cwd });
    return false; // remote is already in our history
  } catch {
    return true; // it isn't — there are commits to pull
  }
}

export async function GET(req: Request) {
  const denied = await guardOwnerRequest(req);
  if (denied) return denied;

  const repo = await getRepoSlug();
  const [local, remote, branch] = await Promise.all([
    getLocalSha(),
    getRemoteSha(repo),
    getCurrentBranch(),
  ]);

  // "Different" is not "behind".
  //
  // This used to be `local !== remote`, which called any divergence an
  // update — including being *ahead* of GitHub, which is the normal state
  // for anyone with unpushed commits. The card then offered an update
  // that would do nothing, directly above a panel correctly reporting
  // "You're already on the latest version": two contradictory claims on
  // one screen, and the actionable-looking one was the wrong one.
  const behind = remote ? await isBehind(remote) : null;
  const updateAvailable =
    local !== null &&
    remote !== null &&
    local !== remote &&
    // null means we could not tell — the remote commit isn't in the local
    // clone, which is itself evidence there is something to fetch.
    behind !== false;

  // Surface as a notification once per remote-SHA so the bell badges.
  // No-op if logActivity dedupes elsewhere; logActivity itself swallows errors.
  if (updateAvailable && remote) {
    void logActivity({
      kind: "system.update_available",
      message: `New version on GitHub (${remote.slice(0, 7)}). Click to update.`,
      level: "info",
      entityType: "update",
    }).catch(() => undefined);
  }

  return Response.json({
    ok: true,
    repo,
    branch,
    local: local?.slice(0, 7) ?? null,
    remote: remote?.slice(0, 7) ?? null,
    updateAvailable,
    diffUrl:
      local && remote
        ? `https://github.com/${repo}/compare/${local.slice(0, 7)}...${remote.slice(0, 7)}`
        : `https://github.com/${repo}/commits/${BRANCH}`,
  });
}

type Step = { name: string; status: "ok" | "skip" | "error"; detail?: string };

function packageJsonHash(): string | null {
  try {
    const buf = readFileSync(path.join(process.cwd(), "package.json"));
    // FNV-1a style cheap hash; we only need to detect changes
    let h = 2166136261;
    for (let i = 0; i < buf.length; i++) {
      h = (h ^ buf[i]) >>> 0;
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16);
  } catch {
    return null;
  }
}

async function detectPm(): Promise<"pnpm" | "npm"> {
  try {
    await exec("pnpm", ["--version"], { cwd: process.cwd(), timeout: 5_000 });
    return "pnpm";
  } catch {
    return "npm";
  }
}

export async function POST(req: Request) {
  const denied = await guardOwnerRequest(req);
  if (denied) return denied;

  if (process.env.RUNNING_IN_DOCKER === "1") {
    return Response.json(
      {
        ok: false,
        error:
          "Inside Docker — update by running on the host: `cd ~/seo && git pull && docker compose up -d --build`",
      },
      { status: 400 },
    );
  }

  try {
    await exec("git", ["--version"], { cwd: process.cwd() });
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "git not found on the server — re-run the install command from the README to upgrade.",
      },
      { status: 500 },
    );
  }

  // ZIP installs have no .git directory. Detect this and steer the user
  // to the right command instead of letting `git fetch` fail mid-flow
  // with a confusing "fatal: not a git repository" error.
  try {
    await exec("git", ["rev-parse", "--git-dir"], { cwd: process.cwd() });
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "This install is not a git repository (ZIP installer was used). To upgrade, re-run the one-line install command from the README — it auto-detects existing installs and refreshes in place, preserving your data.db.",
      },
      { status: 400 },
    );
  }

  // Only ever fast-forward `main`. On any other branch a pull would either
  // target that branch's own upstream or fail; in both cases it is not "the
  // update", and the person is in the middle of something.
  const branch = await getCurrentBranch();
  if (branch !== BRANCH) {
    return Response.json(
      {
        ok: false,
        error: `This install is on the branch "${branch ?? "unknown"}", not "${BRANCH}". Switch back to ${BRANCH} (git switch ${BRANCH}) before updating; nothing was changed.`,
      },
      { status: 409 },
    );
  }

  // Tracked files with uncommitted edits: refuse rather than overwrite them.
  // Untracked files are left alone; git itself refuses a fast-forward that
  // would overwrite one, and that refusal is reported below.
  try {
    const { stdout } = await exec(
      "git",
      ["status", "--porcelain", "--untracked-files=no"],
      { cwd: process.cwd() },
    );
    if (stdout.trim()) {
      return Response.json(
        {
          ok: false,
          error:
            "Some files have uncommitted changes. Commit or stash them before updating; nothing was changed.",
        },
        { status: 409 },
      );
    }
  } catch (err) {
    return Response.json(
      { ok: false, error: `git status failed: ${(err as Error).message.slice(0, 160)}` },
      { status: 500 },
    );
  }

  const steps: Step[] = [];
  let restartRecommended = false;

  const pkgHashBefore = packageJsonHash();

  // 1. fetch
  try {
    await exec("git", ["fetch", "origin", BRANCH], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
    steps.push({ name: "Fetch from GitHub", status: "ok" });
  } catch (err) {
    steps.push({
      name: "Fetch from GitHub",
      status: "error",
      detail: (err as Error).message,
    });
    return Response.json({ ok: false, error: "git fetch failed", steps }, { status: 500 });
  }

  // 2. Fast-forward only, never anything stronger.
  //
  // This used to fall back to `git clean -fd` + `git reset --hard
  // origin/main` whenever the fast-forward failed. That deleted every
  // untracked file (notes, docs, work not yet committed) and threw away
  // local commits on a branch that had diverged, with no way back for the
  // untracked files. A failed fast-forward now stops and says why.
  try {
    const { stdout } = await exec("git", ["merge", "--ff-only", `origin/${BRANCH}`], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
    if (/Already up to date|already up.to.date/i.test(stdout)) {
      steps.push({ name: "Pull latest commit", status: "skip", detail: "Already on latest" });
      return Response.json({
        ok: true,
        message: "You're already on the latest version.",
        steps,
        restartRecommended: false,
      });
    }
    const lastLine = stdout.split("\n").filter(Boolean).slice(-1)[0] ?? "Pulled";
    steps.push({ name: "Pull latest commit", status: "ok", detail: lastLine.slice(0, 80) });
  } catch (ffErr) {
    const detail = (ffErr as Error).message;
    steps.push({ name: "Pull latest commit", status: "error", detail: detail.slice(0, 200) });
    return Response.json(
      {
        ok: false,
        error:
          "The update could not be applied as a simple fast-forward (local commits that are not on GitHub, or an untracked file in the way). Nothing was deleted or reset; update by hand with git.",
        steps,
      },
      { status: 409 },
    );
  }

  // 2. detect package.json change → run install
  const pkgHashAfter = packageJsonHash();
  if (pkgHashBefore !== pkgHashAfter) {
    restartRecommended = true;
    try {
      const pm = await detectPm();
      await exec(pm, ["install"], {
        cwd: process.cwd(),
        timeout: 300_000,
      });
      steps.push({
        name: "Install new dependencies",
        status: "ok",
        detail: `${pm} install`,
      });
    } catch (err) {
      steps.push({
        name: "Install new dependencies",
        status: "error",
        detail: (err as Error).message,
      });
    }
  } else {
    steps.push({
      name: "Install new dependencies",
      status: "skip",
      detail: "package.json unchanged",
    });
  }

  // 3. apply any new migrations
  try {
    const migrateScript = path.join(process.cwd(), "scripts", "migrate.cjs");
    if (existsSync(migrateScript)) {
      const { stdout } = await exec("node", [migrateScript], {
        cwd: process.cwd(),
        timeout: 60_000,
      });
      const applied = stdout.match(/\d+ new migration/);
      steps.push({
        name: "Apply database migrations",
        status: applied ? "ok" : "skip",
        detail: applied ? applied[0] : "Schema already current",
      });
    } else {
      steps.push({
        name: "Apply database migrations",
        status: "skip",
        detail: "no migrate script",
      });
    }
  } catch (err) {
    steps.push({
      name: "Apply database migrations",
      status: "error",
      detail: (err as Error).message,
    });
  }

  // 4. log activity so it surfaces in the bell
  const newSha = (await getLocalSha())?.slice(0, 7) ?? "latest";
  await logActivity({
    kind: "system.updated",
    message: `Updated to commit ${newSha}${restartRecommended ? " — restart required for new dependencies" : ""}`,
    level: "success",
  }).catch(() => undefined);

  const baseMessage = restartRecommended
    ? "Update applied. Restart the server to load the new dependencies."
    : "Update applied. Next.js will hot-reload the changes — refresh the page in a few seconds.";
  return Response.json({
    ok: true,
    message: baseMessage,
    steps,
    restartRecommended,
  });
}

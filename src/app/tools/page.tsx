import { redirect } from "next/navigation";

/**
 * The tool catalogue lives in Settings → Tools, where each tool shows what
 * it needs and can be turned on or off. Tools are opened from projects,
 * missions and search; this address only forwards old links there.
 *
 * The grid component beside this file stays: `pnpm gen:capabilities`
 * reads each tool's name and description out of it.
 */
export default function ToolsHubPage() {
  redirect("/settings/tools");
}
